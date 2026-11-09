
import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LoadingBig } from "../Loading";
import LanguageSwitcher from "../LanguageSwitcher";
import ComboFinder from "./ComboFinder";
import TrainingInfo from "./TrainingInfo";
import Image from "next/image";
import styles from "./page.module.css";
import type {
  CardRow,
  ComboRow,
  TrainingCard,
  TrainingCombo,
} from "./types";
import GoUpButton from "./GoUpButton";

export const metadata: Metadata = {
  title: "Cards and Combos",
};

type ComboMakerParams = {
  id?: string;
};

type PageProps = {
  searchParams: Promise<ComboMakerParams>;
};

type NameColumn =
  | "english_name"
  | "german_name"
  | "spanish_name"
  | "italian_name"
  | "french_name";

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

const LANGUAGE_COLUMNS: Record<string, NameColumn> = {
  en: "english_name",
  de: "german_name",
  es: "spanish_name",
  it: "italian_name",
  fr: "french_name",
};

function getTranslatedName(
  row: NameRow | undefined,
  column: NameColumn,
  fallback: string
): string {
  return (
    row?.[column]?.trim() ||
    row?.english_name?.trim() ||
    fallback
  );
}

async function TrainingData({
  searchParams,
}: PageProps) {
  const [{ id }, cookieStore] = await Promise.all([
    searchParams,
    cookies(),
  ]);

  const language =
    cookieStore.get("npfc-language")?.value ?? "en";

  const nameColumn =
    LANGUAGE_COLUMNS[language] ?? "english_name";

  const supabase = await createClient();

  const [
    cardsResult,
    cardNamesResult,
    combosResult,
    comboNamesResult,
  ] = await Promise.all([
    supabase
      .from("Cards")
      .select("*")
      .order("card_id"),

    supabase
      .from("CardNames")
      .select(
        "card_id, english_name, german_name, spanish_name, italian_name, french_name"
      )
      .order("card_id"),

    supabase
      .from("Combos")
      .select("*")
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
      <p role="alert">
        Unable to load training data: {error.message}
      </p>
    );
  }

  const cardRows =
    (cardsResult.data ?? []) as CardRow[];

  const cardNameRows =
    (cardNamesResult.data ?? []) as CardNameRow[];

  const comboRows =
    (combosResult.data ?? []) as ComboRow[];

  const comboNameRows =
    (comboNamesResult.data ?? []) as ComboNameRow[];

  const cardNameMap = new Map(
    cardNameRows.map((row) => [row.card_id, row])
  );

  const comboNameMap = new Map(
    comboNameRows.map((row) => [row.combo_id, row])
  );

  const cards: TrainingCard[] = cardRows.map((row) => ({
    ...row,
    name: getTranslatedName(
      cardNameMap.get(row.card_id),
      nameColumn,
      `Card #${row.card_id}`
    ),
  }));

  const combos: TrainingCombo[] = comboRows.map((row) => ({
    ...row,
    name: getTranslatedName(
      comboNameMap.get(row.combo_id),
      nameColumn,
      `Combo #${row.combo_id}`
    ),
  }));

  const cardImageUrls: Record<number, string> =
    Object.fromEntries(
      cards.map((card) => [
        card.card_id,
        supabase.storage
          .from("card-images")
          .getPublicUrl(
            `${String(card.card_id).padStart(4, "0")}.png`
          ).data.publicUrl,
      ])
    );

  const comboImageUrls: Record<number, string> =
    Object.fromEntries(
      combos.map((combo) => [
        combo.combo_id,
        supabase.storage
          .from("combo-images")
          .getPublicUrl(
            `${String(combo.combo_id).padStart(4, "0")}.png`
          ).data.publicUrl,
      ])
    );

  if (id !== undefined) {
    const trainingId = Number(id);

    if (
      !/^\d+$/.test(id) ||
      !Number.isSafeInteger(trainingId)
    ) {
      return <p>Invalid training ID.</p>;
    }

    const card = cards.find(
      (entry) => entry.card_id === trainingId
    );

    const combo = combos.find(
      (entry) => entry.combo_id === trainingId
    );

    if (card) {
      return (
        <TrainingInfo
          training={{ kind: "card", data: card }}
          cards={cards}
          cardImageUrls={cardImageUrls}
          comboImageUrls={comboImageUrls}
        />
      );
    }

  if (combo) {
  const previewFilename =
    `${String(combo.combo_id).padStart(4, "0")}.mp4`;

  const comboPreviewUrl = supabase.storage
    .from("combo-previews")
    .getPublicUrl(previewFilename)
    .data.publicUrl;

  return (
    <TrainingInfo
      training={{ kind: "combo", data: combo }}
      comboPreviewUrl={comboPreviewUrl}
      cards={cards}
      cardImageUrls={cardImageUrls}
      comboImageUrls={comboImageUrls}
    />
  );
}

    

return (
  <div className="notFound">
    <Image
      src="/unhappy.png"
      alt="Unhappy"
      width={220}
      height={220}
      className="notFoundImage"
    />
    <h2 className="notFoundText">
      Training not found.
    </h2>
  </div>
);


  }

  return (
    <ComboFinder
      cards={cards}
      combos={combos}
      cardImageUrls={cardImageUrls}
      comboImageUrls={comboImageUrls}
    />
  );
}

async function ComboMakerHeading({
  searchParams,
}: PageProps) {
  const { id } = await searchParams;

  if (id === undefined) {
    return <h1>Cards and Combos</h1>;
  }

  return null;
}


export default function ComboMakerPage({
  searchParams,
}: PageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.languageDock}>
        <LanguageSwitcher />
      </div>

      <div className={styles.content}>
        <Suspense fallback={<h1>Cards and Combos</h1>}>
          <ComboMakerHeading
            searchParams={searchParams}
          />
        </Suspense>

        <Suspense fallback={<LoadingBig />}>
          <TrainingData searchParams={searchParams} />
        </Suspense>
      </div>

      <GoUpButton />
    </main>
  );
}

