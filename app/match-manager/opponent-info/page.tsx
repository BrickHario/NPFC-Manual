import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LanguageSwitcher from "../../LanguageSwitcher";
import { LoadingBig } from "../../Loading";
import MatchManagerInfo from "./MatchManagerInfo";
import type { TeamPlayerTypeProfile } from "./ImportTeamData";
import { decodeFormation } from "./team-formation";
import type { AssignedPlayer } from "./PlayersOnTeam";
import { getPossiblePlayers } from "./possible-players";
import Image from "next/image";
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

  if (!Number.isSafeInteger(teamId) || teamId > 2147483647) {
    notFound();
  }

  return teamId;
}

const getOpponentInfo = cache(async (teamId: number) => {
  const cookieStore = await cookies();
  const savedLanguage = cookieStore.get("npfc-language")?.value;
  const language: Language =
    savedLanguage === "de" ||
    savedLanguage === "es" ||
    savedLanguage === "it" ||
    savedLanguage === "fr"
      ? savedLanguage
      : "en";
  const columns = LANGUAGE_COLUMNS[language];

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

  const name =
    nameResult.data?.[columns.name]?.trim() ||
    nameResult.data?.english_name?.trim() ||
    `Team ${teamId}`;

  const abbr =
    abbrResult.data?.[columns.abbr]?.trim() ||
    abbrResult.data?.english_abbr?.trim() ||
    "";

  return {
    title: name,
    language,
    abbr,
    englishTeamName: nameResult.data?.english_name?.trim() || `Team ${teamId}`,
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

async function getAssignedPlayers(teamId: number): Promise<AssignedPlayer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("Player")
    .select("id_player, name, id_position, price, team_id, Player_Skills(*)")
    .eq("team_id", teamId)
    .order("id_player");

  if (error) throw new Error(error.message);

  return data ?? [];
}

async function getCandidatePlayers(): Promise<AssignedPlayer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("Player")
    .select("id_player, name, id_position, price, team_id, Player_Skills(*)")
    .is("team_id", null)
    .gte("id_player", 0)
    .lt("id_player", 792)
    .gt("price", 0)
    .order("id_player")
    .limit(792);

  if (error) throw new Error(error.message);

  return data ?? [];
}

async function getTeamTypeProfiles(teamId: number): Promise<{
  profiles: TeamPlayerTypeProfile[];
  error: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("TeamPlayerTypes")
    .select(
      "team_id,slot_id,extra_01,extra_02,pot_01,pot_02,pot_03,pot_04,pot_05,pot_06,pot_07,pot_08,pot_09,pot_10,pot_11,pot_12",
    )
    .eq("team_id", teamId)
    .order("slot_id");

  return {
    profiles: error ? [] : data ?? [],
    error: error?.message ?? "",
  };
}

async function OpponentInfoData({ searchParams }: PageProps) {
  const teamId = getTeamId((await searchParams).team_id);

  const { title, abbr, englishTeamName, team, language } =
    await getOpponentInfo(teamId);

  if (!team) {
    return (
      <div className="notFound">
        <Image
          src="/unhappy.png"
          alt="Unhappy"
          width={220}
          height={220}
          className="notFoundImage"
        />

        <h2 className="notFoundText">Team not found.</h2>
      </div>
    );
  }

  const [assignedPlayers, candidates, typeProfiles] = await Promise.all([
    getAssignedPlayers(teamId),
    getCandidatePlayers(),
    getTeamTypeProfiles(teamId),
  ]);

  const possiblePlayers = getPossiblePlayers(team, candidates, assignedPlayers);

  const formationSlots = /^[0-9a-f]{32}$/i.test(team.formation)
    ? decodeFormation(team.formation)
    : [];

  return (
    <MatchManagerInfo
      title={title}
      language={language}
      abbr={abbr}
      englishTeamName={englishTeamName}
      team={team}
      assignedPlayers={assignedPlayers}
      possiblePlayers={possiblePlayers}
      formationSlots={formationSlots}
      typeProfiles={typeProfiles.profiles}
      typeProfileError={typeProfiles.error}
    />
  );
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
