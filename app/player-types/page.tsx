
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import PlayerTypesClient from "./PlayerTypesClient";
import type {
  TrainingEntry,
  TrainingNames,
} from "./training-types";
import { LoadingBig } from "../Loading";
import styles from "./TrainingSelectFilter.module.css";
export const metadata: Metadata = {
  title: "Player Types | NPFC Manual",
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

async function PlayerTypesData() {
  await connection();

  const supabase = await createClient();

  const [
    cardsResult,
    cardNamesResult,
    combosResult,
    comboNamesResult,
  ] = await Promise.all([
    supabase
      .from("Cards")
      .select("card_id")
      .order("card_id"),

    supabase
      .from("CardNames")
      .select(
        "card_id, english_name, german_name, spanish_name, italian_name, french_name"
      )
      .order("card_id"),

    supabase
      .from("Combos")
      .select("combo_id")
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
    cardsResult.data ?? []
  ).map((row) => ({
    kind: "card",
    id: row.card_id,
    names: namesOf(
      cardNames.get(row.card_id),
      `Card #${row.card_id}`
    ),
    imageUrl: supabase.storage
      .from("card-images")
      .getPublicUrl(
        `${String(row.card_id).padStart(4, "0")}.png`
      ).data.publicUrl,
  }));

  const combos: TrainingEntry[] = (
    combosResult.data ?? []
  ).map((row) => ({
    kind: "combo",
    id: row.combo_id,
    names: namesOf(
      comboNames.get(row.combo_id),
      `Combo #${row.combo_id}`
    ),
    imageUrl: supabase.storage
      .from("combo-images")
      .getPublicUrl(
        `${String(row.combo_id).padStart(4, "0")}.png`
      ).data.publicUrl,
  }));

  return (
    <PlayerTypesClient
      trainings={[...cards, ...combos]}
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

