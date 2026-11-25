import Image from "next/image";
import Link from "next/link";
import PlayerImages from "../../marketplace/PlayerImages";
import {
  calculateAttributes,
  getAttributeImage,
  getOverall,
  getPosition,
  rankImages,
  PLAYER_TYPE_NAMES,
  PLAYER_TYPE_COLORS,
  type Language,
} from "@/lib/utils";
import {
  getTeamPlayerSkills,
  type TeamPlayerPosition,
} from "./team-player-skills";
import styles from "./match-manager-info.module.css";
import labels from "./SavedPlayerLabels.module.css";

export type PlayerExperience = {
  playerId: number;
  matchesPlayed: number;
  actionXP: {
    shooting: number;
    longPassing: number;
    throughPassing: number;
    dribbling: number;
    directPassing: number;
  };
  positionXP: {
    gk: number;
    df: number;
    mf: number;
    fw: number;
  };
  actionGrades: {
    shooting: string;
    longPassing: string;
    throughPassing: string;
    dribbling: string;
    directPassing: string;
  };
  positionGrades: {
    gk: string;
    df: string;
    mf: string;
    fw: string;
  };
};

export type AssignedPlayer = {
  id_player: number;
  shirtNumber?: number | null;
  typeIndex?: number | null;
  foot?: "L" | "R" | null;
  experience?: PlayerExperience | null;
  name: string;
  id_position: number;
  price: number | null;
  team_id: number | null;
  Player_Skills: Record<string, number> | Record<string, number>[] | null;
};

type Props = {
  language?: Language;
  players: AssignedPlayer[];
  teamBonuses: number[];
  imported?: boolean;
  savedLevels?: boolean;
  title?: string;
  emptyMessage?: string;
};

const POSITIONS: Record<number, TeamPlayerPosition> = {
  0: "GK",
  1: "DEF",
  2: "MID",
  3: "FWD",
};

const LEVEL_THRESHOLDS = [0, 50, 150, 350, 600, 1000] as const;

function getLevelProgress(value: number, level: number): number {
  if (level >= LEVEL_THRESHOLDS.length - 1) return 100;
  if (level < 0 || !Number.isFinite(value)) return 0;

  const min = LEVEL_THRESHOLDS[level];
  const max = LEVEL_THRESHOLDS[level + 1];
  if (min === undefined || max === undefined) return 0;

  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function getExperienceLevel(points: number): number {
  if (points >= 1000) return 5;
  if (points >= 600) return 4;
  if (points >= 350) return 3;
  if (points >= 150) return 2;
  if (points >= 50) return 1;
  return 0;
}

const SKILL_KEYS = Array.from(
  { length: 10 },
  (_, i) => `skill_${String(i + 1).padStart(2, "0")}`,
);

const INDIVIDUAL_SKILL_ICONS: Record<string, string> = {
  skill_01: "/shooting-power.png",
  skill_02: "/shooting-accuracy.png",
  skill_05: "/tackling.png",
  skill_06: "/ballcontrole.png",
  skill_07: "/dribbling.png",
};

const INDIVIDUAL_SKILL_ROWS = [
  [0, 1],
  [4, 5, 6],
] as const;
const INDIVIDUAL_GRADES = ["E", "D", "C", "B", "A", "S"] as const;

const INDIVIDUAL_SKILL_NAMES: Record<string, string> = {
  skill_01: "Shooting Power",
  skill_02: "Shooting Accuracy",
  skill_05: "Tackling",
  skill_06: "Ball Control",
  skill_07: "Dribbling",
};

function IndividualSkills({
  values,
  points,
}: {
  values: number[];
  points: boolean;
}) {
  return (
    <div className={styles.individualSkills} aria-label="Individual skills">
      {INDIVIDUAL_SKILL_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className={styles.individualSkillRow}>
          {row.map((index) => {
            const value = values[index];
            const skill = SKILL_KEYS[index];
            const skillName = INDIVIDUAL_SKILL_NAMES[skill] ?? skill;
            const level = points ? getExperienceLevel(value) : value;
            const grade = INDIVIDUAL_GRADES[level];
            if (!grade) return null;
            const progress = points
              ? getLevelProgress(value, level)
              : level === 5
              ? 100
              : null;
            const label = `${skill}: ${grade}${
              points ? ` (${value} XP)` : " (exact XP unavailable)"
            }`;

            return (
              <div key={skill} className={styles.individualSkill} title={label}>
                <Image
                  src={INDIVIDUAL_SKILL_ICONS[skill]}
                  alt={skillName}
                  title={`${skillName}: ${grade} (${value} XP)`}
                  width={20}
                  height={20}
                  unoptimized
                  className={styles.individualSkillIcon}
                />
                <div className={styles.individualGradeSlot}>
                  <Image
                    src={rankImages[grade]}
                    alt={grade}
                    width={18}
                    height={18}
                    unoptimized
                    className={styles.individualGrade}
                  />
                  {progress !== null ? (
                    <div
                      className={styles.individualTrack}
                      role="progressbar"
                      aria-label={`${skill}: ${Math.round(
                        progress,
                      )}% to next grade`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(progress)}
                    >
                      <span
                        className={styles.individualDot}
                        style={{ bottom: `${progress}%` }}
                      />
                    </div>
                  ) : (
                    <div
                      className={styles.individualTrack}
                      title="Exact XP unavailable"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const POSITION_EXPERIENCE = [
  { key: "gk", label: "GK", icon: "/gk-pos.png" },
  { key: "df", label: "DF", icon: "/df-pos.png" },
  { key: "mf", label: "MF", icon: "/mf-pos.png" },
  { key: "fw", label: "FW", icon: "/fw-pos.png" },
] as const;

const ACTION_EXPERIENCE = [
  { key: "shooting", label: "Shooting" },
  { key: "longPassing", label: "Long Passing" },
  { key: "throughPassing", label: "Through Passing" },
  { key: "dribbling", label: "Dribbling" },
  { key: "directPassing", label: "Direct Passing" },
] as const;

export default function PlayersOnTeam({
  language = "en",
  players,
  teamBonuses,
  imported = false,
  savedLevels = false,
  title = "Assigned Players",
  emptyMessage = "No assigned players",
}: Props) {
  const sortedPlayers = players
    .map((player) => {
      const skills = Array.isArray(player.Player_Skills)
        ? player.Player_Skills[0]
        : player.Player_Skills;

      const baseSkills = skills ? SKILL_KEYS.map((key) => skills[key]) : null;

      if (imported) {
        const attributes =
          skills &&
          baseSkills?.every((value) => Number.isInteger(value) && value >= 0)
            ? calculateAttributes(skills, "points")
            : null;

        const levels = [0, 50, 150, 350, 600, 1000];

        const baseOverall =
          attributes && baseSkills
            ? Number(
                getOverall(
                  Object.fromEntries(
                    SKILL_KEYS.map((key, i) => [
                      key,
                      levels.reduce(
                        (level, threshold, index) =>
                          baseSkills[i] >= threshold ? index : level,
                        0,
                      ),
                    ]),
                  ),
                ),
              )
            : 0;

        return {
          player,
          baseOverall,
          attributes,
          individualSkills: attributes ? baseSkills : null,
        };
      }

      const valid =
        baseSkills &&
        baseSkills.every(
          (value) => Number.isInteger(value) && value >= 0 && value <= 5,
        );

      const baseOverall = valid && skills ? Number(getOverall(skills)) : 0;

      const position = POSITIONS[player.id_position];

      const adjusted =
        valid && baseSkills && (position || savedLevels)
          ? savedLevels
            ? baseSkills
            : getTeamPlayerSkills(baseSkills, teamBonuses, position!)
          : null;

      const attributes = adjusted
        ? calculateAttributes(
            Object.fromEntries(SKILL_KEYS.map((key, i) => [key, adjusted[i]])),
          )
        : null;

      return {
        player,
        baseOverall,
        attributes,
        individualSkills: adjusted,
      };
    })
    .sort(
      (a, b) =>
        b.baseOverall - a.baseOverall ||
        a.player.id_player - b.player.id_player,
    );

  return (
    <section className={styles.assignedPlayers}>
      <h3 className={styles.assignedTitle}>
        {title} ({sortedPlayers.length})
      </h3>

      {sortedPlayers.length === 0 ? (
        <p className={styles.assignedEmpty}>{emptyMessage}</p>
      ) : (
        <div className={styles.assignedScroll} tabIndex={0} aria-label={title}>
          <div className={styles.assignedList}>
            {sortedPlayers.map(
              ({ player, baseOverall, attributes, individualSkills }) => {
                const isAlien = imported ? false : !player.price;

                const canOpen =
                  imported ||
                  (!isAlien &&
                    (player.id_player < 792 || player.id_player > 1015));

                const showLabels = imported || savedLevels;
                const typeIndex = player.typeIndex;
                const typeName =
                  typeIndex != null && typeIndex >= 0 && typeIndex < 12
                    ? PLAYER_TYPE_NAMES[language]?.[typeIndex] ??
                      PLAYER_TYPE_NAMES.en[typeIndex]
                    : undefined;

                const hasExperience = imported && !!player.experience;

                const content = (
                  <>
                    <div
                      className={
                        hasExperience
                          ? labels.playerExperienceLayout
                          : undefined
                      }
                    >
                      <div className={labels.playerMainColumn}>
                        {showLabels && (
                          <div
                            className={labels.playerType}
                            style={{
                              color:
                                typeIndex != null && typeName
                                  ? PLAYER_TYPE_COLORS[typeIndex]
                                  : undefined,
                            }}
                          >
                            {typeName ?? "—"}
                          </div>
                        )}
                        <div className={styles.playerPortraitSkills}>
                          <div className={labels.card}>
                            <PlayerImages
                              playerId={player.id_player}
                              teamId={player.team_id}
                              imageUrl={`/player-images/${String(
                                player.id_player,
                              ).padStart(4, "0")}.png`}
                              name={player.name}
                              topText={baseOverall}
                              bottomText={player.name}
                              position={getPosition(player.id_position)}
                              isAlien={isAlien}
                              enableHover={canOpen}
                              showRosterLabels={showLabels}
                              shirtNumber={player.shirtNumber}
                              foot={player.foot}
                            />
                          </div>

                          {imported && individualSkills && (
                            <IndividualSkills
                              values={individualSkills}
                              points={imported}
                            />
                          )}
                        </div>

                        {attributes ? (
                          <div className={styles.assignedSkillGrid}>
                            {attributes.map((attribute, index) => {
                              const progress = getLevelProgress(
                                attribute.value,
                                attribute.level,
                              );

                              const progressLabel =
                                attribute.level >= 5
                                  ? `${attribute.name}: Max grade (S)`
                                  : `${attribute.name}: ${Math.round(
                                      progress,
                                    )}% to next grade${
                                      imported ? "" : " (based on skill levels)"
                                    }`;

                              return (
                                <div
                                  key={attribute.name}
                                  className={styles.assignedSkill}
                                  title={`${attribute.name}: ${
                                    attribute.grade
                                  } (${Math.floor(attribute.value)} XP)`}
                                >
                                  <Image
                                    src={getAttributeImage(
                                      attribute.name,
                                      index,
                                    )}
                                    alt={attribute.name}
                                    width={25}
                                    height={25}
                                    unoptimized
                                    className={styles.assignedSkillIcon}
                                  />

                                  <div className={labels.gradeSlot}>
                                    <Image
                                      src={rankImages[attribute.grade]}
                                      alt={attribute.grade}
                                      width={20}
                                      height={20}
                                      unoptimized
                                      className={styles.assignedGrade}
                                    />
                                    <div
                                      className={labels.levelTrack}
                                      role="progressbar"
                                      aria-label={progressLabel}
                                      aria-valuemin={0}
                                      aria-valuemax={100}
                                      aria-valuenow={Math.round(progress)}
                                      title={progressLabel}
                                    >
                                      <span
                                        className={labels.levelDot}
                                        style={{
                                          bottom: `${progress}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className={styles.assignedEmpty}>
                            No skill data
                          </span>
                        )}
                      </div>

                      {hasExperience && player.experience && (
                        <div className={labels.experiencePanel}>
                          <div className={labels.experienceTitle}>
                            Experience
                          </div>

                          <div className={labels.positionExperienceGrid}>
                            {POSITION_EXPERIENCE.map((entry) => {
                              const xp =
                                player.experience!.positionXP[entry.key];
                              const grade =
                                player.experience!.positionGrades[entry.key];
                              const level = getExperienceLevel(xp);
                              const progress = getLevelProgress(xp, level);

                              return (
                                <div
                                  key={entry.key}
                                  className={labels.positionExperienceItem}
                                  title={`${entry.label}: ${grade} (${xp} XP)`}
                                >
                                  <Image
                                    src={entry.icon}
                                    alt={entry.label}
                                    width={48}
                                    height={48}
                                    unoptimized
                                    className={labels.positionExperienceIcon}
                                  />

                                  <div className={labels.gradeSlotLarge}>
                                    <Image
                                      src={rankImages[grade]}
                                      alt={grade}
                                      width={20}
                                      height={20}
                                      unoptimized
                                      className={labels.experienceGrade}
                                    />

                                    <div
                                      className={labels.levelTrackLarge}
                                      role="progressbar"
                                      aria-label={`${entry.label}: ${Math.round(
                                        progress,
                                      )}% to next grade`}
                                      aria-valuemin={0}
                                      aria-valuemax={100}
                                      aria-valuenow={Math.round(progress)}
                                    >
                                      <span
                                        className={labels.levelDotLarge}
                                        style={{
                                          bottom: `${progress}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className={labels.actionExperienceTitle}>
                            Action Skills
                          </div>

                          <div className={labels.actionExperienceList}>
                            {ACTION_EXPERIENCE.map((entry) => {
                              const xp = player.experience!.actionXP[entry.key];
                              const grade =
                                player.experience!.actionGrades[entry.key];
                              const level = getExperienceLevel(xp);
                              const progress = getLevelProgress(xp, level);

                              return (
                                <div
                                  key={entry.key}
                                  className={labels.actionExperienceRow}
                                  title={`${entry.label}: ${grade} (${xp} XP)`}
                                >
                                  <span
                                    className={labels.actionExperienceLabel}
                                  >
                                    {entry.label}
                                  </span>

                                  <div className={labels.gradeSlotLarge}>
                                    <Image
                                      src={rankImages[grade]}
                                      alt={grade}
                                      width={20}
                                      height={20}
                                      unoptimized
                                      className={labels.experienceGrade}
                                    />

                                    <div
                                      className={labels.levelTrackLarge}
                                      role="progressbar"
                                      aria-label={`${entry.label}: ${Math.round(
                                        progress,
                                      )}% to next grade`}
                                      aria-valuemin={0}
                                      aria-valuemax={100}
                                      aria-valuenow={Math.round(progress)}
                                    >
                                      <span
                                        className={labels.levelDotLarge}
                                        style={{
                                          bottom: `${progress}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );

                return canOpen ? (
                  <Link
                    key={player.id_player}
                    id={
                      imported
                        ? `saved-own-player-${player.id_player}`
                        : savedLevels
                        ? `saved-opponent-player-${player.id_player}`
                        : undefined
                    }
                    href={`/marketplace?sort=overall_desc&page=1&id=${player.id_player}`}
                    className={`${styles.assignedPlayer} ${styles.assignedPlayerLink} ${labels.playerLink}`}
                    title={player.name}
                    prefetch={false}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={player.id_player}
                    id={
                      imported
                        ? `saved-own-player-${player.id_player}`
                        : savedLevels
                        ? `saved-opponent-player-${player.id_player}`
                        : undefined
                    }
                    className={`${styles.assignedPlayer} ${styles.assignedPlayerDisabled}`}
                    title={player.name}
                  >
                    {content}
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}
    </section>
  );
}
