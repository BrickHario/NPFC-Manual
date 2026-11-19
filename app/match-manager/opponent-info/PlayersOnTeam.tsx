import Image from "next/image";
import Link from "next/link";
import PlayerImages from "../../marketplace/PlayerImages";
import {
  calculateAttributes,
  getAttributeImage,
  getOverall,
  getPosition,
  rankImages,
} from "@/lib/utils";
import {
  getTeamPlayerSkills,
  type TeamPlayerPosition,
} from "./team-player-skills";
import styles from "./match-manager-info.module.css";

export type AssignedPlayer = {
  id_player: number;
  name: string;
  id_position: number;
  price: number | null;
  team_id: number | null;
  Player_Skills: Record<string, number> | Record<string, number>[] | null;
};

type Props = {
  players: AssignedPlayer[];
  teamBonuses: number[];
  title?: string;
  emptyMessage?: string;
};

const POSITIONS: Record<number, TeamPlayerPosition> = {
  0: "GK",
  1: "DEF",
  2: "MID",
  3: "FWD",
};

const SKILL_KEYS = Array.from(
  { length: 10 },
  (_, i) => `skill_${String(i + 1).padStart(2, "0")}`,
);

export default function PlayersOnTeam({
  players,
  teamBonuses,
  title = "Assigned Players",
  emptyMessage = "No assigned players",
}: Props) {
  const sortedPlayers = players
    .map((player) => {
      const skills = Array.isArray(player.Player_Skills)
        ? player.Player_Skills[0]
        : player.Player_Skills;

      const baseSkills = skills ? SKILL_KEYS.map((key) => skills[key]) : null;

      const valid =
        baseSkills &&
        baseSkills.every(
          (value) => Number.isInteger(value) && value >= 0 && value <= 5,
        );

      const baseOverall = valid && skills ? Number(getOverall(skills)) : 0;

      const position = POSITIONS[player.id_position];

      const adjusted =
        valid && baseSkills && position
          ? getTeamPlayerSkills(baseSkills, teamBonuses, position)
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
            {sortedPlayers.map(({ player, baseOverall, attributes }) => {
              const isAlien = !player.price;

              const canOpen =
                !isAlien && (player.id_player < 792 || player.id_player > 1015);

              const content = (
                <>
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
                  />

                  {attributes ? (
                    <div className={styles.assignedSkillGrid}>
                      {attributes.map((attribute, index) => (
                        <div
                          key={attribute.name}
                          className={styles.assignedSkill}
                          title={`${attribute.name}: ${
                            attribute.grade
                          } (${Math.floor(attribute.value)} XP)`}
                        >
                          <Image
                            src={getAttributeImage(attribute.name, index)}
                            alt={attribute.name}
                            width={25}
                            height={25}
                            unoptimized
                            className={styles.assignedSkillIcon}
                          />

                          <Image
                            src={rankImages[attribute.grade]}
                            alt={attribute.grade}
                            width={20}
                            height={20}
                            unoptimized
                            className={styles.assignedGrade}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.assignedEmpty}>No skill data</span>
                  )}
                </>
              );

              return canOpen ? (
                <Link
                  key={player.id_player}
                  href={`/marketplace?sort=overall_desc&page=1&id=${player.id_player}`}
                  className={`${styles.assignedPlayer} ${styles.assignedPlayerLink}`}
                  title={player.name}
                  prefetch={false}
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={player.id_player}
                  className={`${styles.assignedPlayer} ${styles.assignedPlayerDisabled}`}
                  title={player.name}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
