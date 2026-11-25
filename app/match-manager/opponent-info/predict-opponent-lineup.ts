import { isUnavailable, type PlayerAvailability } from "./player-availability";

const POSITION_WEIGHTS = [
  [0, 2, 5, 12],
  [10, 3, 4, 11],
  [10, 10, 7, 5],
  [0, 5, 15, 2],
  [8, 2, 10, 5],
  [7, 10, 6, 0],
  [10, 2, 5, 8],
  [1, 12, 5, 10],
  [10, 10, 2, 3],
  [8, 8, 5, 8],
] as const;

const FORMATION_ROLE_MAP = [0, 1, 1, 2, 2, 2, 3] as const;

const TYPE_SORT_VALUES = [
  50, 52, 51, 46, 25, 39, 29, 22, 57, 78, 65, 80,
] as const;

function gameSort<T>(values: T[], score: (value: T) => number): T[] {
  const result = [...values];
  const stack: [number, number][] = [[0, result.length]];

  while (stack.length > 0) {
    const [start, length] = stack.pop()!;
    if (length <= 1) continue;

    const end = start + length - 1;
    const pivot = score(result[end]);
    let left = start - 1;
    let right = end;

    while (true) {
      do {
        left++;
      } while (score(result[left]) < pivot);

      do {
        right--;
      } while (right > left && pivot < score(result[right]));

      if (left < right) {
        [result[left], result[right]] = [result[right], result[left]];
      } else {
        [result[left], result[end]] = [result[end], result[left]];

        if (left - start > 1) stack.push([start, left - start]);
        if (end - left > 1) stack.push([left + 1, end - left]);
        break;
      }
    }
  }

  return result;
}

export function arrangeLikeGame<
  T extends {
    playerId: number;
    rosterSlot: number;
    lineupSlot: number;
    typeIndex: number | null;
  },
>(starters: T[], formationRoleCodes: number[]): T[] {
  const roleCodes = formationRoleCodes.slice(0, 11);
  if (starters.length !== 11 || roleCodes.length !== 11) return starters;

  if (
    roleCodes.some(
      (code) =>
        !Number.isInteger(code) ||
        code < 0 ||
        code >= FORMATION_ROLE_MAP.length,
    )
  ) {
    return starters;
  }

  const original = [...starters].sort((a, b) => a.lineupSlot - b.lineupSlot);
  if (
    original.some(
      (player, index) =>
        player.lineupSlot !== index ||
        player.typeIndex === null ||
        !Number.isInteger(player.typeIndex) ||
        player.typeIndex < 0 ||
        player.typeIndex >= TYPE_SORT_VALUES.length,
    )
  )
    return starters;

  const orderedSlots = gameSort(
    Array.from({ length: 11 }, (_, i) => i),
    (slot) => roleCodes[slot],
  );

  const orderedPlayers = gameSort(
    original,
    (player) =>
      FORMATION_ROLE_MAP[roleCodes[player.lineupSlot]] * 256 +
      TYPE_SORT_VALUES[player.typeIndex!],
  );

  return orderedPlayers
    .map((player, index) => ({ ...player, lineupSlot: orderedSlots[index] }))
    .sort((a, b) => a.lineupSlot - b.lineupSlot);
}

type OpponentPlayer = {
  id: number;
  availability?: PlayerAvailability | null;
  rosterSlot: number;
  fatigue: number;
  skills: number[];
  typeIndex: number | null;
};

type OpponentLineup = {
  primaryOrder: number[];
  formationRoleCodes: number[];
};

export type PredictedLineupSlot = {
  playerId: number;
  rosterSlot: number;
  lineupSlot: number;
  primaryRank: number;
  score: number;
  fatiguePenalty: number;
  typeIndex: number | null;
};

export function predictOpponentLineup(
  roster: OpponentPlayer[],
  lineup: OpponentLineup,
  positionsById: Map<number, number>,
  playerPreference: number,
) {
  const ranked = roster.flatMap((player) => {
    if (isUnavailable(player.availability)) return [];

    const role = positionsById.get(player.id);

    if (role === undefined || !Number.isInteger(role) || role < 0 || role > 3) {
      return [];
    }

    if (
      player.skills.length !== 10 ||
      player.skills.some(
        (grade) => !Number.isInteger(grade) || grade < 0 || grade > 5,
      )
    ) {
      return [];
    }

    const positionScore = player.skills.reduce(
      (sum, grade, index) => sum + grade * 20 * POSITION_WEIGHTS[index][role],
      0,
    );
    const fatiguePenalty = Math.floor((player.fatigue * playerPreference) / 25);

    return [
      {
        ...player,
        role,
        positionScore,
        fatiguePenalty,
        score: positionScore - fatiguePenalty,
        primaryRank: lineup.primaryOrder.indexOf(player.rosterSlot),
      },
    ];
  });

  ranked.sort((a, b) => b.score - a.score || a.primaryRank - b.primaryRank);

  const available = [...ranked];
  const selected: PredictedLineupSlot[] = [];

  for (let lineupSlot = 0; lineupSlot < 18; lineupSlot++) {
    if (available.length === 0) break;

    const formationCode = lineup.formationRoleCodes[lineupSlot];
    const requiredRole = FORMATION_ROLE_MAP[formationCode];
    let index = available.findIndex((player) => player.role === requiredRole);

    if (index < 0) index = 0;

    const [player] = available.splice(index, 1);
    selected.push({
      playerId: player.id,
      rosterSlot: player.rosterSlot,
      lineupSlot,
      primaryRank: player.primaryRank,
      score: player.score,
      fatiguePenalty: player.fatiguePenalty,
      typeIndex: player.typeIndex,
    });
  }

  return {
    starters: arrangeLikeGame(selected.slice(0, 11), lineup.formationRoleCodes),
    bench: selected.slice(11, 18),
  };
}
