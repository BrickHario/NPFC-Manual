import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LanguageSwitcher from "../../LanguageSwitcher";
import { LoadingBig } from "../../Loading";
import MatchManagerInfo from "./MatchManagerInfo";
import styles from "./match-manager-info.module.css";

type PageProps = {
  searchParams: Promise<{ team_id?: string | string[] }>;
};

const LANGUAGE_COLUMNS = {
  en: { name: "english_name", abbr: "english_abbr" },
  de: { name: "german_name", abbr: "german_abbr" },
  fr: { name: "french_name", abbr: "french_abbr" },
  it: { name: "italian_name", abbr: "italian_abbr" },
  es: { name: "spanish_name", abbr: "spanish_abbr" },
} as const;

type Language = keyof typeof LANGUAGE_COLUMNS;

function getTeamId(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) notFound();

  const teamId = Number(value);

  if (!Number.isSafeInteger(teamId) || teamId > 2147483647) notFound();

  return teamId;
}

const getOpponentInfo = cache(async (teamId: number) => {
  const cookieStore = await cookies();
  const language = cookieStore.get("npfc-language")?.value ?? "en";
  const columns = LANGUAGE_COLUMNS[language as Language] ?? LANGUAGE_COLUMNS.en;
  const supabase = await createClient();

  const [nameResult, abbrResult, teamResult] = await Promise.all([
    supabase
      .from("TeamNames")
      .select(
        "english_name, german_name, french_name, italian_name, spanish_name",
      )
      .eq("team_id", teamId)
      .maybeSingle(),
    supabase
      .from("TeamAbbr")
      .select(
        "english_abbr, german_abbr, french_abbr, italian_abbr, spanish_abbr",
      )
      .eq("team_id", teamId)
      .maybeSingle(),
    supabase.from("Teams").select("*").eq("team_id", teamId).maybeSingle(),
  ]);

  const error = nameResult.error ?? abbrResult.error ?? teamResult.error;

  if (error) throw new Error(error.message);

  if (!nameResult.data || !teamResult.data) notFound();

  const name =
    nameResult.data[columns.name]?.trim() ||
    nameResult.data.english_name?.trim() ||
    `Team ${teamId}`;

  const abbr =
    abbrResult.data?.[columns.abbr]?.trim() ||
    abbrResult.data?.english_abbr?.trim() ||
    "";

  return {
    title: abbr ? `${name} (${abbr})` : name,
    team: teamResult.data,
  };
});

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const teamId = getTeamId((await searchParams).team_id);
  const { title } = await getOpponentInfo(teamId);

  return { title };
}

async function OpponentInfoData({ searchParams }: PageProps) {
  const teamId = getTeamId((await searchParams).team_id);
  const { title, team } = await getOpponentInfo(teamId);

  return <MatchManagerInfo title={title} team={team} />;
}

export default function OpponentInfoPage({ searchParams }: PageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.languageDock}>
        <LanguageSwitcher />
      </div>

      <Suspense fallback={<LoadingBig />}>
        <OpponentInfoData searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
