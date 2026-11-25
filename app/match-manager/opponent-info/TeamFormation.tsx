"use client";

import { getFormationName, type TeamFormationSlot } from "./team-formation";
import {
  getFieldImage,
  PLAYER_TYPE_NAMES,
  PLAYER_TYPE_COLORS,
  type Language,
} from "@/lib/utils";
import styles from "./match-manager-info.module.css";
import labels from "./FormationPlayers.module.css";

export type FormationPlayer = {
  slotId: number;
  playerId: number;
  name: string;
  shirtNumber: number | null;
  typeIndex: number | null;
  positionId?: number | null;
};

type Props = {
  language?: Language;
  slots: TeamFormationSlot[];
  stadiumId: number | null;
  players?: FormationPlayer[];
  benchPlayers?: FormationPlayer[];
  loadingNames?: boolean;
};

type Position = "goalkeeper" | "defender" | "midfielder" | "forward";

function getPosition(slot: TeamFormationSlot): Position {
  if (slot.slot_id === 0) return "goalkeeper";
  if (slot.fieldY < 6) return "defender";
  if (slot.fieldY < 10) return "midfielder";
  return "forward";
}

const POSITION_CLASSES: Record<Position, string> = {
  goalkeeper: styles.formationGoalkeeper,
  defender: styles.formationDefender,
  midfielder: styles.formationMidfielder,
  forward: styles.formationForward,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getColumn(fieldX: number) {
  return clamp(Math.round(fieldX), 1, 15);
}

function getOutfieldRow(fieldY: number) {
  return clamp(13 - Math.round(fieldY), 1, 10);
}

function getSlotStyle(slot: TeamFormationSlot) {
  const column = getColumn(slot.fieldX);
  const left = `${((column - 0.5) / 15) * 100}%`;

  if (slot.slot_id === 0) {
    return { left, top: "87.5%" };
  }

  const row = getOutfieldRow(slot.fieldY);

  return {
    left,
    top: `${4 + ((row - 0.5) / 10) * 74}%`,
  };
}

const BENCH_POSITIONS = [
  "goalkeeper",
  "defender",
  "midfielder",
  "forward",
] as const;

function PlayerMarker({
  language,
  player,
  position,
  loadingNames,
}: {
  language: Language;
  player: FormationPlayer;
  position?: Position;
  loadingNames: boolean;
}) {
  const typeIndex = player.typeIndex;
  const typeName =
    typeIndex != null && typeIndex >= 0 && typeIndex < 12
      ? PLAYER_TYPE_NAMES[language]?.[typeIndex] ??
        PLAYER_TYPE_NAMES.en[typeIndex]
      : undefined;
  const typeColor =
    typeIndex != null ? PLAYER_TYPE_COLORS[typeIndex] ?? "#ffffff" : "#ffffff";

  return (
    <button
      type="button"
      className={labels.marker}
      disabled={loadingNames}
      aria-label={`Show ${player.name} in player list`}
      title={`${player.name} · #${player.shirtNumber ?? "—"} · ${
        typeName ?? "Unknown type"
      }`}
      onClick={() => {
        document
          .getElementById(`saved-opponent-player-${player.playerId}`)
          ?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "auto"
              : "smooth",
            block: "nearest",
            inline: "center",
          });
      }}
    >
      <span className={labels.name}>{loadingNames ? "…" : player.name}</span>
      <span
        className={`${styles.formationCircle} ${
          position ? POSITION_CLASSES[position] : labels.unknownPosition
        } ${labels.number}`}
      >
        {player.shirtNumber ?? "—"}
      </span>
      <span className={labels.type} style={{ color: typeColor }}>
        {typeName ?? "—"}
      </span>
    </button>
  );
}

export default function TeamFormation({
  language = "en",
  slots,
  stadiumId,
  players,
  benchPlayers,
  loadingNames = false,
}: Props) {
  const fieldImage = getFieldImage(stadiumId);
  const bySlot = new Map(
    players?.map((player) => [player.slotId, player]) ?? [],
  );

  return (
    <section className={styles.formationSection} aria-label="Team Formation">
      <h2 className={styles.formationHeading}>
        Team Formation
        {players !== undefined && " – Probable"}
        {slots.length > 0 && ` (${getFormationName(slots)})`}
      </h2>

      {slots.length === 0 ? (
        <p className={styles.formationMissing}>Formation not available.</p>
      ) : (
        <>
          <div
            className={styles.formationPitch}
            style={{
              backgroundImage: `url("/field-images/${fieldImage}.png")`,
            }}
          >
            <div className={styles.formationGrid} />
            <div className={styles.formationField}>
              {slots.map((slot) => {
                const position = getPosition(slot);
                const player = bySlot.get(slot.slot_id);

                return (
                  <div
                    key={slot.slot_id}
                    className={styles.formationSlot}
                    style={getSlotStyle(slot)}
                  >
                    {player ? (
                      <PlayerMarker
                        language={language}
                        player={player}
                        position={position}
                        loadingNames={loadingNames}
                      />
                    ) : (
                      <span
                        className={`${styles.formationCircle} ${POSITION_CLASSES[position]}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {benchPlayers && benchPlayers.length > 0 && (
            <div
              className={labels.benchSection}
              aria-label="Substitutes and reserves"
            >
              <div className={labels.benchPitch}>
                <div className={labels.benchGrid}>
                  {benchPlayers.map((player, index) => (
                    <div
                      key={player.playerId}
                      className={labels.benchSlot}
                      style={{
                        gridColumn: (index % 7) * 2 + 2,
                        gridRow: index < 7 ? 1 : 3,
                      }}
                    >
                      <PlayerMarker
                        language={language}
                        player={player}
                        position={
                          player.positionId != null
                            ? BENCH_POSITIONS[player.positionId]
                            : undefined
                        }
                        loadingNames={loadingNames}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
