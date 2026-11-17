import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import LanguageSwitcher from "../LanguageSwitcher";
import { LoadingBig } from "../Loading";
import styles from "./match-manager-page.module.css";

export const metadata: Metadata = {
  title: "Match Manager",
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
  { id: 0, name: "Beginner League", icon: "/beginner.png" },
  { id: 1, name: "Advanced League", icon: "/advanced.png" },
  { id: 2, name: "Pro League 2", icon: "/2-liga.png" },
  { id: 3, name: "Pro League 1", icon: "/1-liga.png" },
  { id: 4, name: "Europe", icon: "/eurocup.png" },
  { id: 5, name: "International", icon: "/weltcup.png" },
];

function getInitialLeague(teamId: number): number {
  if (teamId < 5) return 0;
  if (teamId < 11) return 1;
  if (teamId < 19) return 2;
  if (teamId < 31) return 3;
  if (teamId < 37) return 4;
  if (teamId === 44) return 4;
  return 5;
}

type TeamStrengthData = {
  strength_lvl: number;
  pos_loyalty: number;
  bonus_shoot: number;
  bonus_speed: number;
  bonus_stamina: number;
  bonus_tech: number;
  bonus_toughness: number;
  bonus_jump: number;
  bonus_willpower: number | null;
  action_shooting: number | null;
  action_long_passing: number | null;
  action_through_passing: number | null;
  action_dribbling: number | null;
  action_direct_passing: number | null;
};

function getTeamStrength(team: TeamStrengthData): number {
  const strength = team.strength_lvl;
  const familiarity = team.pos_loyalty;

  const actions =
    (team.action_shooting ?? 0) +
    (team.action_long_passing ?? 0) +
    (team.action_through_passing ?? 0) +
    (team.action_dribbling ?? 0) +
    (team.action_direct_passing ?? 0);

  const bonusValues = [
    team.bonus_shoot,
    team.bonus_speed,
    team.bonus_stamina,
    team.bonus_tech,
    team.bonus_toughness,
    team.bonus_jump,
    team.bonus_willpower ?? 0,
  ];

  const counts = [2, 1, 1, 3, 1, 1, 1];
  const weights = [15.5, 13.2, 1, 19.3, 6.9, 10.6, 5.1];

  const weightedBoosts = bonusValues.reduce((sum, bonus, i) => {
    const grade = Math.trunc((Math.trunc((bonus * 12) / counts[i]) + 50) / 100);

    return sum + weights[i] * (grade / 5);
  }, 0);

  return (
    17.1 * (strength / 8) +
    weightedBoosts +
    1.3 * (actions / 25) +
    10 * (familiarity / 5)
  );
}

function getTeamIcon(teamId: number): string {
  return `/team-images/${String(teamId).padStart(4, "0")}.png`;
}

async function OpponentTeamsData() {
  const cookieStore = await cookies();
  const language = cookieStore.get("npfc-language")?.value ?? "en";
  const nameColumn = LANGUAGE_COLUMNS[language] ?? "english_name";
  const supabase = await createClient();

  const [teamsResult, teamNamesResult] = await Promise.all([
    supabase.from("Teams").select("*").order("team_id"),
    supabase
      .from("TeamNames")
      .select(
        "team_id, english_name, german_name, french_name, italian_name, spanish_name",
      )
      .order("team_id"),
  ]);

  const error = teamsResult.error ?? teamNamesResult.error;

  if (error) {
    return <p role="alert">{error.message}</p>;
  }

  const teamNames = new Map<number, TeamNameRow>(
    (teamNamesResult.data ?? []).map((row) => [row.team_id, row]),
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
      rating: getTeamStrength(team),
    };
  });

  return (
    <div className={styles.leagues}>
      {LEAGUES.map((league) => {
        const leagueTeams = teams
          .filter((team) => team.leagueId === league.id)
          .sort((a, b) => b.rating - a.rating || a.team_id - b.team_id);

        return (
          <section key={league.id} className={styles.league}>
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

                          <span className={styles.teamName}>{team.name}</span>

                          <span className={styles.teamStrength}>
                            {Math.round(team.rating)}
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

      <h1>Match Manager</h1>

      <Suspense fallback={<LoadingBig />}>
        <OpponentTeamsData />
      </Suspense>
    </main>
  );
}
