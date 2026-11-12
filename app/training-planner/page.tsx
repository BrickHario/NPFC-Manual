
import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PlayerTypesClient from "./PlayerTypesClient";
import PotentialCurvesProvider from "./PotentialCurvesProvider";
import { calculateTrainingFatigue } from "./training-types";
import type {
  TrainingEntry,
  TrainingNames,
} from "./training-types";
import {
  PLAYER_SELECTION_COOKIE,
  parsePlayerIds,
  type PlayerTypeSelection,
} from "./player-selection";
import { LoadingBig } from "../Loading";
import styles from "./TrainingSelectFilter.module.css";
import { getPosition, type Language } from "../../lib/utils";

export const metadata: Metadata = {
  title: "Training Planner",
};

type NameRow = {
  english_name: string | null;
  german_name: string | null;
  spanish_name: string | null;
  italian_name: string | null;
  french_name: string | null;
};

type CardNameRow = NameRow & {
  card_id: number;
};

type ComboNameRow = NameRow & {
  combo_id: number;
};

type TrainingRow = {
  card_id?: number | null;
  combo_id?: number | null;
  card1_id?: number | null;
  card2_id?: number | null;
  card3_id?: number | null;
  has_match_actions?: boolean | number | null;
  gk_only?: boolean | number | null;
  xtra_01: number | null;
  xtra_02: number | null;
  random_01?: number | null;
  skill_01: number | null;
  skill_02: number | null;
  skill_03: number | null;
  skill_04: number | null;
  skill_05: number | null;
  skill_06: number | null;
  skill_07: number | null;
  skill_08: number | null;
  skill_09: number | null;
  skill_10: number | null;
  pot_01: number | null;
  pot_02: number | null;
  pot_03: number | null;
  pot_04: number | null;
  pot_05: number | null;
  pot_06: number | null;
  pot_07: number | null;
  pot_08: number | null;
  pot_09: number | null;
  pot_10: number | null;
  pot_11: number | null;
  pot_12: number | null;
};

type PlayerSkillsRow = {
  id_player: number;
  skill_01: number | null;
  skill_02: number | null;
  skill_03: number | null;
  skill_04: number | null;
  skill_05: number | null;
  skill_06: number | null;
  skill_07: number | null;
  skill_08: number | null;
  skill_09: number | null;
  skill_10: number | null;
};

const skillColumns = Array.from(
  { length: 10 },
  (_, index) => `skill_${String(index + 1).padStart(2, "0")}`
);

const potColumns = Array.from(
  { length: 12 },
  (_, index) => `pot_${String(index + 1).padStart(2, "0")}`
);

const trainingSelect =
  "skill_01,skill_02,skill_03,skill_04,skill_05,skill_06,skill_07,skill_08,skill_09,skill_10,pot_01,pot_02,pot_03,pot_04,pot_05,pot_06,pot_07,pot_08,pot_09,pot_10,pot_11,pot_12,xtra_01,xtra_02" as const;

const playerSkillsSelect =
  "id_player,skill_01,skill_02,skill_03,skill_04,skill_05,skill_06,skill_07,skill_08,skill_09,skill_10" as const;

function getPotChanges(row: TrainingRow): number[] {
  return potColumns.map((column) =>
    Number(row[column as keyof TrainingRow] ?? 0)
  );
}

function getSkillChanges(row: TrainingRow): number[] {
  return skillColumns.map((column) =>
    Number(row[column as keyof TrainingRow] ?? 0)
  );
}

function getPlayerSkills(row: PlayerSkillsRow): number[] {
  return skillColumns.map((column) =>
    Number(row[column as keyof PlayerSkillsRow] ?? 0)
  );
}

function namesOf(
  row: NameRow | undefined,
  fallback: string
): TrainingNames {
  const english = row?.english_name?.trim() || fallback;

  return {
    en: english,
    de: row?.german_name?.trim() || english,
    es: row?.spanish_name?.trim() || english,
    it: row?.italian_name?.trim() || english,
    fr: row?.french_name?.trim() || english,
  };
}

function normalizeLanguage(value?: string): Language {
  if (
    value === "de" ||
    value === "en" ||
    value === "es" ||
    value === "it" ||
    value === "fr"
  ) {
    return value;
  }

  return "en";
}

function getCurvePoints(value: unknown): number[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const points = Array.from({ length: 33 }, (_, index) => {
    const value = row[`point_${String(index).padStart(2, "0")}`];
    return value === null || value === undefined || value === ""
      ? NaN
      : Number(value);
  });
  return points.every(Number.isFinite) ? points : null;
}

async function PlayerTypesData({
  searchParams,
}: {
  searchParams: Promise<{
    playerId?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const supabase = await createClient();

  const initialLanguage = normalizeLanguage(
    cookieStore.get("npfc-language")?.value
  );

  const storedIds = parsePlayerIds(
    cookieStore.get(PLAYER_SELECTION_COOKIE)?.value
  );

  const requestedId =
    typeof params.playerId === "string"
      ? Number(params.playerId)
      : null;

  const playerIds = [...storedIds];

  if (
    requestedId !== null &&
    Number.isSafeInteger(requestedId) &&
    requestedId >= 0 &&
    !playerIds.includes(requestedId)
  ) {
    playerIds.push(requestedId);
  }

  const [
    cardsResult,
    cardNamesResult,
    combosResult,
    comboNamesResult,
    playersResult,
    skillsResult,
    dummyCurveResult,
    positionsFirstResult,
    positionsSecondResult,
  ] = await Promise.all([
    supabase
      .from("Cards")
      .select(`card_id,random_01,${trainingSelect}` as const)
      .order("card_id"),

    supabase
      .from("CardNames")
      .select(
        "card_id,english_name,german_name,spanish_name,italian_name,french_name"
      )
      .order("card_id"),

    supabase
      .from("Combos")
      .select(`combo_id,card1_id,card2_id,card3_id,has_match_actions,gk_only,${trainingSelect}` as const)
      .order("combo_id"),

    supabase
      .from("ComboNames")
      .select(
        "combo_id,english_name,german_name,spanish_name,italian_name,french_name"
      )
      .order("combo_id"),

    playerIds.length > 0
      ? supabase
          .from("Player")
          .select("id_player,name,Potential_Curves(*)")
          .in("id_player", playerIds)
      : Promise.resolve({ data: [], error: null }),

    playerIds.length > 0
      ? supabase
          .from("Player_Skills")
          .select(playerSkillsSelect)
          .in("id_player", playerIds)
      : Promise.resolve({ data: [], error: null }),

    supabase
      .from("Potential_Curves")
      .select("*")
      .eq("id_potential", 0)
      .maybeSingle(),

    supabase
      .from("Player")
      .select("id_player,id_position")
      .order("id_player")
      .range(0, 999),

    supabase
      .from("Player")
      .select("id_player,id_position")
      .order("id_player")
      .range(1000, 1999),
  ]);

  const error =
    cardsResult.error ??
    cardNamesResult.error ??
    combosResult.error ??
    comboNamesResult.error ??
    playersResult.error ??
    skillsResult.error ??
    dummyCurveResult.error ??
    positionsFirstResult.error ??
    positionsSecondResult.error;

  if (error) {
    return (
      <main>
        <p role="alert">
          Unable to load data: {error.message}
        </p>
      </main>
    );
  }

  const cardNames = new Map(
    ((cardNamesResult.data ?? []) as CardNameRow[]).map(
      (row) => [row.card_id, row]
    )
  );

  const comboNames = new Map(
    ((comboNamesResult.data ?? []) as ComboNameRow[]).map(
      (row) => [row.combo_id, row]
    )
  );

  const cardSkillMap = new Map(
    ((cardsResult.data ?? []) as TrainingRow[]).map((row) => [
      Number(row.card_id),
      getSkillChanges(row),
    ])
  );

  const cards: TrainingEntry[] = (
    (cardsResult.data ?? []) as TrainingRow[]
  ).map((row) => {
    const id = Number(row.card_id);

    return {
      kind: "card",
      id,
      hasMatchActions: false,
      xtra_01: Number(row.xtra_01 ?? 0),
      xtra_02: Number(row.xtra_02 ?? 0),
      random_01: Number(row.random_01 ?? 0),
      skillChanges: getSkillChanges(row),
      fatigueChange: calculateTrainingFatigue([{ skillPoints: getSkillChanges(row) }]),
      names: namesOf(cardNames.get(id), `Card #${id}`),
      imageUrl: supabase.storage
        .from("card-images")
        .getPublicUrl(
          `${String(id).padStart(4, "0")}.png`
        ).data.publicUrl,
      potChanges: getPotChanges(row),
    };
  });

  const combos: TrainingEntry[] = (
    (combosResult.data ?? []) as TrainingRow[]
  ).map((row) => {
    const id = Number(row.combo_id);
    const requiredCardIds = [row.card1_id, row.card2_id, row.card3_id]
      .filter((cardId): cardId is number => cardId !== null && cardId !== undefined);
    const ingredientSkills = requiredCardIds
      .map((cardId) => cardSkillMap.get(cardId))
      .filter((values): values is number[] => values !== undefined);

    return {
      kind: "combo",
      id,
      gkOnly: row.gk_only === true || row.gk_only === 1,
      xtra_01: Number(row.xtra_01 ?? 0),
      xtra_02: Number(row.xtra_02 ?? 0),
      hasMatchActions:
        row.has_match_actions === true ||
        row.has_match_actions === 1,
      names: namesOf(comboNames.get(id), `Combo #${id}`),
      skillChanges: getSkillChanges(row),
      requiredCardIds,
      fatigueChange: ingredientSkills.length === requiredCardIds.length
        ? calculateTrainingFatigue(ingredientSkills.map((skillPoints) => ({ skillPoints })))
        : 0,
      imageUrl: supabase.storage
        .from("combo-images")
        .getPublicUrl(
          `${String(id).padStart(4, "0")}.png`
        ).data.publicUrl,
      potChanges: getPotChanges(row),
    };
  });

  const playerMap = new Map(
    (playersResult.data ?? []).map((player) => [
      Number(player.id_player),
      player,
    ])
  );

  const skillsMap = new Map(
    ((skillsResult.data ?? []) as PlayerSkillsRow[]).map(
      (skills) => [Number(skills.id_player), skills]
    )
  );

  const playerCurves: Record<number, number[]> = {};
  for (const row of playersResult.data ?? []) {
    const relation = row.Potential_Curves;
    const curve = getCurvePoints(Array.isArray(relation) ? relation[0] : relation);
    if (curve) playerCurves[Number(row.id_player)] = curve;
  }

  const initialPotentialCurves = {
    players: playerCurves,
    dummy: getCurvePoints(dummyCurveResult.data),
  };

  const initialPlayers: PlayerTypeSelection[] = playerIds
    .map((id) => {
      const player = playerMap.get(id);
      const skills = skillsMap.get(id);

      if (!player || !skills) return null;

      return {
        id,
        name: player.name,
        imageUrl: supabase.storage
          .from("player-images")
          .getPublicUrl(
            `${String(id).padStart(4, "0")}.png`
          ).data.publicUrl,
        skills: getPlayerSkills(skills),
      };
    })
    .filter(
      (player): player is PlayerTypeSelection =>
        player !== null
    );

  return (
    <PotentialCurvesProvider value={initialPotentialCurves}>
      <PlayerTypesClient
        trainings={[...cards, ...combos]}
        initialLanguage={initialLanguage}
        initialPlayers={initialPlayers}
        goalkeeperIds={[...(positionsFirstResult.data ?? []), ...(positionsSecondResult.data ?? [])]
          .filter((player) => getPosition(player.id_position) === "GK")
          .map((player) => Number(player.id_player))}
      />
    </PotentialCurvesProvider>
  );
}

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{
    playerId?: string | string[];
  }>;
}) {
  return (
    <Suspense
      fallback={
        <div className={styles.loading}>
          <LoadingBig />
        </div>
      }
    >
      <PlayerTypesData searchParams={searchParams} />
    </Suspense>
  );
}
