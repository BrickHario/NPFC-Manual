import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PlayerTypesClient from "./PlayerTypesClient";
import type {
  TrainingEntry,
  TrainingNames,
} from "./training-types";
import { LoadingBig } from "../Loading";
import styles from "./TrainingSelectFilter.module.css";
import type { Language } from "../../lib/utils";

export const metadata: Metadata = {
  title: "Player Types",
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

const potColumns = Array.from(
  { length: 12 },
  (_, index) => `pot_${String(index + 1).padStart(2, "0")}`
);

const trainingSelect =
  "skill_01,skill_02,skill_03,skill_04,skill_05,skill_06,skill_07,skill_08,skill_09,skill_10,pot_01,pot_02,pot_03,pot_04,pot_05,pot_06,pot_07,pot_08,pot_09,pot_10,pot_11,pot_12" as const;

function getPotChanges(row: TrainingRow): number[] {
  return potColumns.map((column) => {
    const value = row[column as keyof TrainingRow];
    return typeof value === "number" ? value : 0;
  });
}


const skillColumns = Array.from(
  { length: 10 },
  (_, index) => `skill_${String(index + 1).padStart(2, "0")}`
);

function getSkillChanges(row: TrainingRow): number[] {
  return skillColumns.map((column) => {
    const value = row[column as keyof TrainingRow];
    return typeof value === "number" ? value : 0;
  });
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

function normalizeLanguage(value: string | undefined): Language {
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

async function PlayerTypesData() {
  const cookieStore = await cookies();
  const initialLanguage = normalizeLanguage(
    cookieStore.get("npfc-language")?.value
  );

  const supabase = await createClient();

  const [
    cardsResult,
    cardNamesResult,
    combosResult,
    comboNamesResult,
  ] = await Promise.all([
    supabase
      .from("Cards")
      .select(`card_id,${trainingSelect}` as const)
      .order("card_id"),

    supabase
      .from("CardNames")
      .select(
        "card_id, english_name, german_name, spanish_name, italian_name, french_name"
      )
      .order("card_id"),

    supabase
      .from("Combos")
      .select(`combo_id,${trainingSelect}` as const)
      .order("combo_id"),

    supabase
      .from("ComboNames")
      .select(
        "combo_id, english_name, german_name, spanish_name, italian_name, french_name"
      )
      .order("combo_id"),
  ]);

  const error =
    cardsResult.error ??
    cardNamesResult.error ??
    combosResult.error ??
    comboNamesResult.error;

  if (error) {
    return (
      <main>
        <p role="alert">
          Unable to load training data: {error.message}
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

  const cards: TrainingEntry[] = (
    (cardsResult.data ?? []) as TrainingRow[]
  ).map((row) => {
    const id = Number(row.card_id);

    return {
      kind: "card",
      id,
      skillChanges: getSkillChanges(row),
      names: namesOf(
        cardNames.get(id),
        `Card #${id}`
      ),
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

    return {
      kind: "combo",
      id,
      names: namesOf(
        comboNames.get(id),
        `Combo #${id}`
      ),
      skillChanges: getSkillChanges(row),
      imageUrl: supabase.storage
        .from("combo-images")
        .getPublicUrl(
          `${String(id).padStart(4, "0")}.png`
        ).data.publicUrl,
      potChanges: getPotChanges(row),
    };
  });

  return (
    <PlayerTypesClient
      trainings={[...cards, ...combos]}
      initialLanguage={initialLanguage}
    />
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className={styles.loading}>
          <LoadingBig />
        </div>
      }
    >
      <PlayerTypesData />
    </Suspense>
  );
}