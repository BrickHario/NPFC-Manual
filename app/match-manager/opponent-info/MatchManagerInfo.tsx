import Image from "next/image";
import { Suspense } from "react";
import {
  GRADES,
  rankImages,
  formatPrice,
  getAttributeImage,
  STADIUMS,
  type Language,
} from "@/lib/utils";
import PlayersOnTeam, { type AssignedPlayer } from "./PlayersOnTeam";
import type { TeamFormationSlot } from "./team-formation";
import { SQUAD_BUDGETS, getSquadSize } from "./possible-players";
import styles from "./match-manager-info.module.css";
import {
  TeamImportProvider,
  ImportTeamHeader,
  ImportedTeamSkillBoost,
  ImportedTeamPlayers,
  ImportedTeamFormation,
  type TeamPlayerTypeProfile,
} from "./ImportTeamData";
import { LoadingBig } from "@/app/Loading";

type Team = {
  team_id: number;
  formation: string;
  strength_lvl: number;
  play_style: number;
  discipline: number;
  sub_style: number;
  player_pref: number;
  pos_loyalty: number;
  stadium_id: number | null;
  action_shooting: number | null;
  action_long_passing: number | null;
  action_through_passing: number | null;
  action_dribbling: number | null;
  action_direct_passing: number | null;
  bonus_shoot: number;
  bonus_speed: number;
  bonus_stamina: number;
  bonus_tech: number;
  bonus_toughness: number;
  bonus_jump: number;
  bonus_willpower: number | null;
};

type Props = {
  language?: Language;
  title: string;
  abbr: string;
  englishTeamName: string;
  team: Team;
  assignedPlayers: AssignedPlayer[];
  possiblePlayers: AssignedPlayer[];
  formationSlots: TeamFormationSlot[];
  typeProfiles?: TeamPlayerTypeProfile[];
  typeProfileError?: string;
};

type TacticBarProps = {
  title: string;
  value: number;
  leftLabel: string;
  rightLabel: string;
};

const LEAGUES = [
  { id: 0, name: "Beginner League", icon: "/beginner.png" },
  { id: 1, name: "Advanced League", icon: "/advanced.png" },
  { id: 2, name: "Pro League 2", icon: "/2-liga.png" },
  { id: 3, name: "Pro League 1", icon: "/1-liga.png" },
  { id: 4, name: "Europe", icon: "/mondial-icon.png" },
  { id: 5, name: "International", icon: "/mondial-icon.png" },
];

const CROWD_LEVELS = [1, 1, 2, 3, 4, 5, 6, 7, 7] as const;

const CROWD_PRESSURE_FACTORS = [0, 1, 1, 1, 2, 2, 3, 3] as const;

const CROWD_LABELS = ["None", "Low", "Medium", "High"] as const;

const CROWD_TONES = [
  styles.crowdNone,
  styles.crowdLow,
  styles.crowdMedium,
  styles.crowdHigh,
] as const;

export function getCrowdPressure(strengthLevel: number) {
  const strength = Math.max(0, Math.min(8, Math.trunc(strengthLevel)));

  const crowdLevel = CROWD_LEVELS[strength];
  const pressureFactor = CROWD_PRESSURE_FACTORS[crowdLevel];

  return {
    crowdLevel,
    pressureFactor,
    maxCrowdLevel: 7,
    maxPressureFactor: 3,
  };
}

const KITS = [
  { folder: "goalkeeper", name: "Keeper" },
  { folder: "home", name: "Home" },
  { folder: "away", name: "Away" },
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

function GradeIcon({ value }: { value: number | null }) {
  const grade = value !== null ? GRADES[value] : undefined;

  if (!grade || !rankImages[grade]) {
    return <span className={styles.gradeMissing}>—</span>;
  }

  return (
    <Image
      src={rankImages[grade]}
      alt={grade}
      title={grade}
      width={30}
      height={32}
      unoptimized
      className={styles.gradeIcon}
    />
  );
}

function TacticBar({ title, value, leftLabel, rightLabel }: TacticBarProps) {
  const position = Math.max(0, Math.min(100, value));

  return (
    <div className={styles.tacticBar}>
      <div className={styles.tacticTitle}>{title}:</div>

      <div
        className={styles.tacticTrack}
        role="meter"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={position}
      >
        <div className={styles.tacticRange}>
          <div className={styles.tacticMarker} style={{ left: `${position}%` }}>
            {value}
          </div>
        </div>
      </div>

      <div className={styles.tacticLabels}>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

export default function MatchManagerInfo({
  language = "en",
  title,
  abbr,
  englishTeamName,
  team,
  assignedPlayers,
  possiblePlayers,
  formationSlots,
  typeProfiles = [],
  typeProfileError = "",
}: Props) {
  const teamImageId = String(team.team_id).padStart(4, "0");

  const league = LEAGUES[getInitialLeague(team.team_id)];

  const stadium =
    team.stadium_id === null ? null : STADIUMS[team.stadium_id] ?? null;

  const stadiumName = stadium?.name ?? `${englishTeamName} Stadium`;

  const squadSize = getSquadSize(team);
  const targetSquadBudget = SQUAD_BUDGETS[team.strength_lvl];

  const { crowdLevel, pressureFactor, maxCrowdLevel } = getCrowdPressure(
    team.strength_lvl,
  );

  const crowdLabel = CROWD_LABELS[pressureFactor];
  const crowdTone = CROWD_TONES[pressureFactor];

  const actionSkills = [
    { name: "Shooting", value: team.action_shooting },
    { name: "Long Passing", value: team.action_long_passing },
    { name: "Through Passing", value: team.action_through_passing },
    { name: "Dribbling", value: team.action_dribbling },
    { name: "Direct Passing", value: team.action_direct_passing },
  ];

  const skillBoosts = [
    { name: "Shoot", value: team.bonus_shoot },
    { name: "Speed", value: team.bonus_speed },
    { name: "Stamina", value: team.bonus_stamina },
    { name: "Technic", value: team.bonus_tech },
    { name: "Strength", value: team.bonus_toughness },
    { name: "Jump", value: team.bonus_jump },
    { name: "Will", value: team.bonus_willpower },
  ];

  const teamBonuses = skillBoosts.map((attribute) => attribute.value ?? 0);

  return (
    <TeamImportProvider teamId={team.team_id}>
      <ImportTeamHeader title={title} abbr={abbr} />

      <div className={styles["panel-opp-info"]}>
        <div className={styles.teamOverview}>
          <Image
            src={`/team-images/${teamImageId}.png`}
            alt={title}
            width={150}
            height={150}
            unoptimized
            className={styles.teamIcon}
          />

          <div className={styles.teamDetails}>
            <div className={styles.leagueRow}>
              <strong>Rank:</strong>

              <Image
                src={league.icon}
                alt={league.name}
                title={league.name}
                width={32}
                height={32}
                unoptimized
                className={styles.leagueIcon}
              />
            </div>

            <div>
              Target Squad Size: <strong>{squadSize}</strong>
            </div>

            <div>
              Target Squad Budget:{" "}
              <strong>
                {targetSquadBudget !== undefined
                  ? formatPrice(targetSquadBudget)
                  : "—"}
              </strong>
            </div>
          </div>

          <div className={styles.kits}>
            {KITS.map((kit) => (
              <div key={kit.folder} className={styles.kit}>
                <Image
                  src={`/kits-images/${kit.folder}/${teamImageId}.png`}
                  alt={`${kit.name} kit`}
                  width={54}
                  height={28}
                  unoptimized
                  className={styles.kitImage}
                />

                <span>{kit.name}</span>
              </div>
            ))}
          </div>

          <div className={styles.tactics}>
            <TacticBar
              title="Play Style"
              value={team.play_style}
              leftLabel="Defensive"
              rightLabel="Offensive"
            />

            <TacticBar
              title="Discipline"
              value={team.discipline}
              leftLabel="Flexible"
              rightLabel="Strict"
            />

            <TacticBar
              title="Substitution"
              value={team.sub_style}
              leftLabel="Reactive"
              rightLabel="Proactive"
            />

            <TacticBar
              title="Player Selection"
              value={team.player_pref}
              leftLabel="Reliable"
              rightLabel="Spontaneous"
            />
          </div>
        </div>

        <Suspense
          key={team.team_id}
          fallback={
            <div className={styles.formationLoading}>
              <LoadingBig />
            </div>
          }
        >
          <ImportedTeamFormation
            language={language}
            abbr={abbr}
            slots={formationSlots}
            stadiumId={team.stadium_id}
            teamId={team.team_id}
            playerPreference={team.player_pref}
            typeProfiles={typeProfiles}
            typeProfileError={typeProfileError}
          />
        </Suspense>

        <div className={styles.teamAbilities}>
          <div className={styles.stadium}>
            <div className={styles.stadiumTitle}>
              {stadium ? stadiumName : "Stadium not available"}
            </div>

            {stadium && (
              <Image
                src={`/stadion-images/${stadium.model}.png`}
                alt={stadiumName}
                title={stadium.model}
                width={300}
                height={230}
                unoptimized
                className={styles.stadiumImage}
              />
            )}

            <div className={styles.crowdPressure}>
              <div className={styles.crowdRow}>
                <span>Crowd Pressure:</span>

                <strong
                  className={`${styles.crowdValue} ${crowdTone}`}
                  title={`Pressure Factor ${pressureFactor}`}
                >
                  {crowdLabel}
                </strong>
              </div>

              <div className={styles.crowdRow}>
                <span>Crowd Level:</span>

                <div
                  className={styles.crowdLevelIcons}
                  title={`${crowdLevel}/${maxCrowdLevel}`}
                  aria-label={`Crowd Level ${crowdLevel} of ${maxCrowdLevel}`}
                >
                  {Array.from({ length: crowdLevel }).map((_, index) => (
                    <Image
                      key={index}
                      src="/crowd.png"
                      alt=""
                      width={20}
                      height={20}
                      unoptimized
                      aria-hidden="true"
                      className={styles.crowdLevelIcon}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.positionFamiliarity}>
            <strong>Position Experience</strong>
            <GradeIcon value={team.pos_loyalty} />
          </div>

          <div className={styles.actionSkills}>
            <h2 className={styles.actionTitle}>Action Skills</h2>

            <div className={styles.actionList}>
              {actionSkills.map((skill) => (
                <div key={skill.name} className={styles.actionRow}>
                  <span>{skill.name}</span>
                  <GradeIcon value={skill.value} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.skillBoostSection}>
          <ImportedTeamSkillBoost>
            <h2 className={styles.skillBoostTitle}>Player Skill Boost</h2>

            <div className={styles.skillBoostGrid}>
              {skillBoosts.map((attribute, index) => (
                <div
                  key={attribute.name}
                  className={styles.skillBoostItem}
                  title={`${attribute.name}: ${attribute.value ?? "—"}`}
                >
                  <Image
                    src={getAttributeImage(attribute.name, index)}
                    alt={attribute.name}
                    width={30}
                    height={30}
                    unoptimized
                    className={styles.skillBoostIcon}
                  />

                  <span className={styles.skillBoostValue}>
                    {attribute.value ?? "—"}
                  </span>
                </div>
              ))}
            </div>

            <PlayersOnTeam
              language={language}
              title="Assigned Players"
              emptyMessage="No assigned players"
              players={assignedPlayers}
              teamBonuses={teamBonuses}
            />

            <PlayersOnTeam
              language={language}
              title="Possible Players"
              emptyMessage="No possible players"
              players={possiblePlayers}
              teamBonuses={teamBonuses}
            />
          </ImportedTeamSkillBoost>
          <ImportedTeamPlayers
            language={language}
            title={title}
            abbr={abbr}
            teamId={team.team_id}
          />
        </div>
      </div>
    </TeamImportProvider>
  );
}
