export const GRADE_POINTS = [0, 2, 3, 5, 8, 10] as const;

export const SKILL_WEIGHTS = [
  [0, 5],
  [1, 4],
  [4, 3],
  [4, 1],
  [1, 3],
  [5, 0],
  [0, 3],
  [4, 1],
  [3, 3],
  [2, 1],
] as const;

export const SLOT_WEIGHTS = [
  [5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 2, 3, 4, 0, 1, 1, 1, 1, 1, 1],
] as const;

const GRADE_THRESHOLDS = [0, 50, 150, 350, 600, 1000] as const;
const LEAGUE_SIZES = [6, 6, 8, 12] as const;

export type MatchPlayer = { skills: number[] };
export type TeamForecastStrength = { defense: number; offense: number };

export function readForecastRankBase(
  view: DataView,
  teamId: number,
): number | null {
  if (
    !Number.isInteger(teamId) ||
    teamId < -1 ||
    teamId >= 44 ||
    view.byteLength < 0x1d0
  )
    return null;
  const leagueOffset = teamId === -1 ? 0x858 : 0x2570 + teamId * 0x260;
  if (leagueOffset >= view.byteLength) return null;
  const league =
    teamId === -1
      ? view.getUint8(leagueOffset) >>> 4
      : view.getUint8(leagueOffset);
  if (league >= 4) return 185;
  const base = 0x364 + league * 0x98;
  const size = LEAGUE_SIZES[league];
  if (base + 0x98 > view.byteLength) return null;
  if ((view.getUint8(base) & 1) === 0) {
    let index = 0;
    while (index < 32 && view.getInt8(0x1b0 + index) !== teamId) index++;
    return (31 - index) * 5 + 25;
  }
  let index = 0;
  while (index < size && view.getInt8(base + 0x28 + index * 8) !== teamId)
    index++;
  if (index === size) return null;
  const rank = view.getUint8(base + 0x10 + index);
  if (rank >= size) return null;
  const preceding = LEAGUE_SIZES.slice(0, league).reduce<number>(
    (sum, count) => sum + count,
    0,
  );
  return (preceding + size - rank - 1) * 5 + 25;
}

export function xpToForecastGrade(xp: number): number {
  if (!Number.isFinite(xp) || xp < 0) throw new Error("Invalid skill XP");
  return GRADE_THRESHOLDS.reduce<number>(
    (grade, threshold, index) => (xp >= threshold ? index : grade),
    0,
  );
}

export function getTeamForecastStrength(
  players: (MatchPlayer | null)[],
): TeamForecastStrength {
  if (players.length !== 18 || players.slice(0, 11).some((player) => !player)) {
    throw new Error("Expected 11 starters and 7 bench slots");
  }
  if (
    players.some(
      (player) =>
        player &&
        (player.skills.length !== 10 ||
          player.skills.some(
            (grade) => !Number.isInteger(grade) || grade < 0 || grade > 5,
          )),
    )
  ) {
    throw new Error("Invalid skill grades");
  }
  const getAxis = (axis: 0 | 1): number => {
    const scores = players.map((player, slot) => {
      if (!player) return 0;
      const skillScore = player.skills.reduce(
        (sum, grade, index) =>
          sum + GRADE_POINTS[grade] * SKILL_WEIGHTS[index][axis],
        0,
      );
      return skillScore * SLOT_WEIGHTS[axis][slot];
    });
    const starterScore = scores
      .slice(0, 11)
      .reduce((sum, score) => sum + score, 0);
    const benchScore = scores
      .slice(11, 18)
      .sort((a, b) => b - a)
      .slice(0, 3)
      .reduce((sum, score) => sum + score, 0);
    return Math.min(
      110,
      Math.floor(
        ((starterScore + benchScore) * (axis === 0 ? 120 : 140)) / 5280,
      ),
    );
  };
  return { defense: getAxis(0), offense: getAxis(1) };
}

export function getResultsForecast(
  team0: TeamForecastStrength,
  team1: TeamForecastStrength,
  rankBase0: number,
  rankBase1: number,
  homeSide: 0 | 1 | null,
) {
  let value0 = Math.max(0, team0.defense - team1.offense + 50);
  let value1 = Math.max(0, team1.defense - team0.offense + 50);
  if (homeSide === 0) value0 = Math.min(150, Math.floor((value0 * 15) / 10));
  if (homeSide === 1) value1 = Math.min(150, Math.floor((value1 * 15) / 10));
  const strength0 = rankBase0 + 3 * value0;
  const strength1 = rankBase1 + 3 * value1;
  const total = strength0 + strength1;
  if (total <= 0) return null;
  const baseDraw = Math.max(
    5,
    35 - Math.floor(Math.abs(strength0 - strength1) / 6),
  );
  const winPool = 100 - baseDraw - (total % 10);
  const team0Win = Math.floor((strength0 * winPool) / total);
  const team1Win = Math.floor((strength1 * winPool) / total);
  return {
    team0Win,
    draw: 100 - team0Win - team1Win,
    team1Win,
    strength0,
    strength1,
  };
}
