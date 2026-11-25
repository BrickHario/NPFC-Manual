"use client";

import Image from "next/image";
import { useState } from "react";
import { getAttributeImage, rankImages } from "@/lib/utils";
import { averageStat, scoreGrade, type TeamStatsPlayer } from "./team-stats";
import styles from "./TeamStats.module.css";

type PositionFilter = "all" | "0" | "1" | "2" | "3";
type SquadFilter = "all" | "lineup" | "sub";

const POSITIONS = [
  { id: "all", label: "All" },
  { id: "0", label: "GK" },
  { id: "1", label: "DEF" },
  { id: "2", label: "MID" },
  { id: "3", label: "ST" },
] as const;

const SQUADS = [
  { id: "all", label: "All" },
  { id: "lineup", label: "Lineup" },
  { id: "sub", label: "Sub" },
] as const;

const SKILLS = [
  "Shoot",
  "Speed",
  "Stamina",
  "Technic",
  "Strength",
  "Jump",
  "Will",
];
const POSITION_EXPERIENCE = [
  { name: "GK", icon: "/gk-pos.png" },
  { name: "DEF", icon: "/df-pos.png" },
  { name: "MID", icon: "/mf-pos.png" },
  { name: "ST", icon: "/fw-pos.png" },
];
const ACTIONS = [
  "Shooting",
  "Long Passing",
  "Through Passing",
  "Dribbling",
  "Direct Passing",
];

const GRADE_BAR_BOUNDARIES = [0, 19, 38, 57, 76, 95, 100] as const;

function getGradeBarPosition(value: number): number {
  const score = Math.max(0, Math.min(100, value));
  const level = Math.min(5, Math.floor((score * 6) / 100));
  const progress = (score * 6) / 100 - level;
  const start = GRADE_BAR_BOUNDARIES[level];
  const end = GRADE_BAR_BOUNDARIES[level + 1];
  return start + (end - start) * progress;
}

function StatRow({
  name,
  icon,
  values,
  movement = false,
}: {
  name: string;
  icon?: string;
  values: (number | null | undefined)[];
  movement?: boolean;
}) {
  const { value, count } = averageStat(values);
  const grade = value === null || movement ? null : scoreGrade(value);
  const display = value === null ? "—" : String(Math.round(value));
  const description = `${name}: ${display}${
    grade ? ` (${grade})` : ""
  } · ${count}/${values.length} players`;

  return (
    <div
      className={`${styles.statRow} ${icon ? styles.iconRow : ""}`}
      title={description}
    >
      <div className={styles.statLabel}>
        {icon && <Image src={icon} width={30} height={30} unoptimized alt="" />}
        <span className={icon ? styles.srOnly : undefined}>{name}</span>
      </div>
      <div className={styles.barRow}>
        <div className={styles.barSpace}>
          <div
            className={`${styles.bar} ${movement ? styles.movementBar : ""}`}
            aria-hidden="true"
          />
          {!movement &&
            GRADE_BAR_BOUNDARIES.slice(1, -1).map((boundary) => (
              <span
                className={styles.tick}
                key={boundary}
                style={{ left: `${boundary}%` }}
              />
            ))}
          {value !== null && (
            <span
              className={styles.marker}
              style={{
                left: `${
                  movement
                    ? Math.max(0, Math.min(100, value))
                    : getGradeBarPosition(value)
                }%`,
              }}
            >
              {display}
            </span>
          )}
        </div>
        <div className={styles.grade} aria-label={description}>
          {grade && rankImages[grade] ? (
            <Image
              src={rankImages[grade]}
              width={27}
              height={27}
              unoptimized
              alt={grade}
            />
          ) : (
            <span>{movement && value !== null ? display : "—"}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeamStats({
  players,
  isOwnTeam,
  loading,
  imported,
}: {
  players: TeamStatsPlayer[];
  isOwnTeam: boolean;
  loading: boolean;
  imported: boolean;
}) {
  const [position, setPosition] = useState<PositionFilter>("all");
  const [squad, setSquad] = useState<SquadFilter>("all");
  const filtered = players.filter(
    (player) =>
      (position === "all" || player.positionId === Number(position)) &&
      (isOwnTeam ||
        squad === "all" ||
        (squad === "lineup"
          ? player.selection === "lineup"
          : player.selection !== "lineup")),
  );

  return (
    <div className={styles.panel}>
      <div className={styles.filters}>
        <div
          className={styles.switch}
          role="group"
          aria-label="Position filter"
        >
          {POSITIONS.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={position === item.id}
              className={position === item.id ? styles.active : ""}
              onClick={() => setPosition(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {!isOwnTeam && (
          <div className={styles.switch} role="group" aria-label="Squad filter">
            {SQUADS.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={squad === item.id}
                className={squad === item.id ? styles.active : ""}
                onClick={() => setSquad(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {!imported ? (
        <p className={styles.message}>
          Import a save to display squad averages.
        </p>
      ) : loading ? (
        <p className={styles.message}>Loading opponent players…</p>
      ) : (
        <>
          {filtered.length === 0 && (
            <p className={styles.message}>No players match these filters.</p>
          )}
          <section className={styles.category} aria-label="Skills">
            <h3>Skills Ø</h3>
            {SKILLS.map((name, index) => (
              <StatRow
                key={name}
                name={name}
                icon={getAttributeImage(name, index)}
                values={filtered.map((player) => player.skillScores[index])}
              />
            ))}
          </section>
          {isOwnTeam && position !== "all" && (
            <section
              className={styles.category}
              aria-label="Position Experience"
            >
              <h3>Position Experience Ø</h3>
              <StatRow
                name={POSITION_EXPERIENCE[Number(position)].name}
                icon={POSITION_EXPERIENCE[Number(position)].icon}
                values={filtered.map(
                  (player) => player.positionScores[Number(position)],
                )}
              />
            </section>
          )}
          {isOwnTeam && (
            <section className={styles.category} aria-label="Action Skills">
              <h3>Action Skills Ø</h3>
              {ACTIONS.map((name, index) => (
                <StatRow
                  key={name}
                  name={name}
                  values={filtered.map((player) => player.actionScores[index])}
                />
              ))}
            </section>
          )}
          <section className={styles.category} aria-label="Movement">
            <h3>Movement Ø</h3>
            <StatRow
              name="Defensive"
              values={filtered.map((player) => player.movement?.[0])}
              movement
            />
            <StatRow
              name="Offensive"
              values={filtered.map((player) => player.movement?.[1])}
              movement
            />
          </section>
        </>
      )}
    </div>
  );
}
