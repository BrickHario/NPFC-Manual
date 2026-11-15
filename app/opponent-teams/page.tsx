import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import LanguageSwitcher from "../LanguageSwitcher";
import { LoadingBig } from "../Loading";
import styles from "./opponent-teams-page.module.css";

export const metadata: Metadata = {
  title: "Opponent Teams",
};

type NameColumn =
  | "english_name"
  | "german_name"
  | "french_name"
  | "italian_name"
  | "spanish_name";

type TeamNameRow = {
  team_id: number;
} & Record<NameColumn, string>;

const LANGUAGE_COLUMNS: Record<string, NameColumn> = {
  en: "english_name",
  de: "german_name",
  fr: "french_name",
  it: "italian_name",
  es: "spanish_name",
};

const LEAGUES = [
  {
    id: 0,
    name: "Beginner League",
    icon: "/beginner.png",
  },
  {
    id: 1,
    name: "Advanced League",
    icon: "/advanced.png",
  },
  {
    id: 2,
    name: "Pro League 2",
    icon: "/2-liga.png",
  },
  {
    id: 3,
    name: "Pro League 1",
    icon: "/1-liga.png",
  },
  {
    id: 4,
    name: "Europe",
    icon: "/eurocup.png",
  },
  {
    id: 5,
    name: "International",
    icon: "/weltcup.png",
  },
];

function getInitialLeague(teamId: number): number {
  if (teamId < 5) return 0;
  if (teamId < 11) return 1;
  if (teamId < 19) return 2;
  if (teamId < 31) return 3;
  if (teamId < 37) return 4;
  if (teamId == 44) return 4;
  return 5;
}

type TeamStrengthData = {
  strength_lvl: number;
  bonus_skill: number;
  bonus_shoot: number;
  bonus_speed: number;
  bonus_stamina: number;
  bonus_tech: number;
  bonus_toughness: number;
  bonus_jump: number;
};

function getTeamStrength(team: TeamStrengthData): number {
  return Math.trunc(
    (team.strength_lvl + 1) *
    (
      team.bonus_skill +
      team.bonus_shoot +
      team.bonus_speed +
      team.bonus_stamina +
      team.bonus_tech +
      team.bonus_toughness +
      team.bonus_jump
    ) / 10
  );
}

function getTeamIcon(teamId: number): string {
  return `/team-images/${String(teamId).padStart(4, "0")}.png`;
}

async function OpponentTeamsData() {
  const cookieStore = await cookies();

  const language =
    cookieStore.get("npfc-language")?.value ?? "en";

  const nameColumn =
    LANGUAGE_COLUMNS[language] ?? "english_name";

  const supabase = await createClient();

  const [teamsResult, teamNamesResult] = await Promise.all([
    supabase
      .from("Teams")
      .select("*")
      .order("team_id"),

    supabase
      .from("TeamNames")
      .select(
        "team_id, english_name, german_name, french_name, italian_name, spanish_name"
      )
      .order("team_id"),
  ]);

  const error = teamsResult.error ?? teamNamesResult.error;

  if (error) {
    return <p role="alert">{error.message}</p>;
  }

  const teamNames = new Map<number, TeamNameRow>(
    (teamNamesResult.data ?? []).map((row) => [
      row.team_id,
      row,
    ])
  );

  const teams = (teamsResult.data ?? []).map((team) => {
    const names = teamNames.get(team.team_id);

    return {
      ...team,
      name:
        names?.[nameColumn]?.trim() ||
        names?.english_name?.trim() ||
        `Team ${team.team_id}`,
      leagueId: getInitialLeague(team.team_id),
    };
  });

  return (
    <div className={styles.leagues}>
      {LEAGUES.map((league) => {
        const leagueTeams = teams
            .filter((team) => team.leagueId === league.id)
            .sort((a, b) => getTeamStrength(b) - getTeamStrength(a));

        return (
          <section
            key={league.id}
            className={styles.league}
          >
            <h2 className={styles.leagueHeading}>
              <Image
                src={league.icon}
                alt=""
                width={44}
                height={32}
                className={styles.leagueIcon}
              />
              <span>{league.name}</span>
            </h2>

            <div className={styles.tableWrapper}>
              <table className={styles.teamTable}>
                <tbody>
                  {leagueTeams.map((team, index) => (
                    <tr
                      key={team.team_id}
                      className={
                        index === 0
                          ? styles.gold
                          : index === 1
                            ? styles.silver
                            : index === 2
                              ? styles.bronze
                              : styles.teamRow
                      }
                    >
                      <td>
                        <div className={styles.teamContent}>
                            <Image
                                src={getTeamIcon(team.team_id)}
                                alt=""
                                width={60}
                                height={60}
                                className={styles.teamIcon}
                            />

                            <span className={styles.teamName}>
                                {team.name}
                            </span>

                            <span className={styles.teamStrength}>
                                {getTeamStrength(team)}
                            </span>
                            </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function OpponentTeamsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.languageDock}>
        <LanguageSwitcher />
      </div>

      <h1>Opponent Teams</h1>

      <Suspense fallback={<LoadingBig />}>
        <OpponentTeamsData />
      </Suspense>
    </main>
  );
}