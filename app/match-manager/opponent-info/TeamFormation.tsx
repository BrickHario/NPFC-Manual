"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  getAvailabilityLabel,
  isUnavailable,
  type PlayerAvailability,
} from "./player-availability";
import TypesChart from "@/app/training-planner/TypesChart";
import MovementChart from "@/app/training-planner/MovementChart";
import { playerTypeRows } from "@/app/training-planner/player-type-data";
import { calculatePlayerPosition } from "@/app/training-planner/player-type-calculation";
import chartStyles from "@/app/training-planner/TypesChart.module.css";
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
  availability?: PlayerAvailability | null;
  positionId?: number | null;
  typeWeights?: number[] | null;
  extraValues?: [number, number] | null;
};

type Props = {
  language?: Language;
  slots: TeamFormationSlot[];
  stadiumId: number | null;
  players?: FormationPlayer[];
  benchPlayers?: FormationPlayer[];
  ownPlayers?: FormationPlayer[];
  opponentAbbr?: string;
  ownAbbr?: string;
  loadingNames?: boolean;
  typeProfileError?: string;
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
  const unavailable = isUnavailable(player.availability);
  const availabilityLabel = getAvailabilityLabel(player.availability);
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
      }${unavailable ? ` · ${availabilityLabel}` : ""}`}
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
      {unavailable && (
        <Image
          src="/blocked.png"
          alt={availabilityLabel}
          title={availabilityLabel}
          width={20}
          height={20}
          unoptimized
          style={{
            position: "absolute",
            left: "calc(100% + 1px)",
            top: "50%",
            transform: "translateY(-50%)",
            width: "3.4cqw",
            height: "3.4cqw",
            objectFit: "contain",
            imageRendering: "pixelated",
            pointerEvents: "none",
          }}
        />
      )}
      <span className={labels.type} style={{ color: typeColor }}>
        {typeName ?? "—"}
      </span>
    </button>
  );
}

function getOpponentChartPlayers(players: FormationPlayer[]) {
  const unique = [
    ...new Map(players.map((player) => [player.playerId, player])).values(),
  ];

  return unique.flatMap((player) => {
    if (
      !player.typeWeights ||
      player.typeWeights.length !== 12 ||
      !player.typeWeights.every(Number.isFinite)
    )
      return [];

    const { x, y } = calculatePlayerPosition(player.typeWeights);
    const row = playerTypeRows[y];
    let calculatedType: number | undefined;
    for (let i = 0; row && i < row.length; i += 2) {
      if (x <= row[i]) {
        calculatedType = row[i + 1];
        break;
      }
    }

    return [
      {
        id: player.playerId,
        name: player.name,
        imageUrl: `/player-images/${String(player.playerId).padStart(
          4,
          "0",
        )}.png`,
        startPosition: { x, y },
        path: [],
        typeMismatch:
          player.typeIndex != null && calculatedType !== player.typeIndex,
      },
    ];
  });
}

function getOpponentMovementPlayers(players: FormationPlayer[]) {
  const unique = [
    ...new Map(players.map((player) => [player.playerId, player])).values(),
  ];

  return unique.flatMap((player) => {
    const values = player.extraValues;
    if (
      !values ||
      values.length !== 2 ||
      !values.every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 100,
      )
    )
      return [];

    return [
      {
        id: player.playerId,
        name: player.name,
        imageUrl: `/player-images/${String(player.playerId).padStart(
          4,
          "0",
        )}.png`,
        startPosition: { x: values[0], y: values[1] },
        path: [],
      },
    ];
  });
}

export default function TeamFormation({
  language = "en",
  slots,
  stadiumId,
  players,
  benchPlayers,
  ownPlayers,
  opponentAbbr = "—",
  ownAbbr,
  loadingNames = false,
  typeProfileError = "",
}: Props) {
  const [chartMode, setChartMode] = useState<
    "formation" | "types" | "movement"
  >("formation");
  const [selectedPlayerKey, setSelectedPlayerKey] = useState<string | null>(
    null,
  );
  const [selectedTeam, setSelectedTeam] = useState<"opponent" | "own">(
    "opponent",
  );
  const hasImportedTeam = ownPlayers !== undefined;
  const showOwnTeam =
    hasImportedTeam && selectedTeam === "own" && chartMode !== "formation";
  const chartLoading = !showOwnTeam && loadingNames;

  const currentPlayers = useMemo(
    () =>
      showOwnTeam
        ? ownPlayers ?? []
        : [...(players ?? []), ...(benchPlayers ?? [])],
    [showOwnTeam, ownPlayers, players, benchPlayers],
  );

  const chartPlayers = useMemo(
    () =>
      chartMode === "types" && !chartLoading
        ? getOpponentChartPlayers(currentPlayers)
        : [],
    [chartMode, chartLoading, currentPlayers],
  );

  const movementPlayers = useMemo(
    () =>
      chartMode === "movement" && !chartLoading
        ? getOpponentMovementPlayers(currentPlayers)
        : [],
    [chartMode, chartLoading, currentPlayers],
  );
  const visibleChartPlayers =
    chartMode === "movement" ? movementPlayers : chartPlayers;
  const totalPlayers = new Set(currentPlayers.map((player) => player.playerId))
    .size;
  const missingCoordinates = totalPlayers - visibleChartPlayers.length;
  const hasTypeMismatch = chartPlayers.some((player) => player.typeMismatch);

  const activePlayerKey = visibleChartPlayers.some(
    (player) => String(player.id) === selectedPlayerKey,
  )
    ? selectedPlayerKey
    : null;

  function handleChartSelect(key: string | null) {
    setSelectedPlayerKey(key);
    if (key === null) return;

    document
      .getElementById(`saved-${showOwnTeam ? "own" : "opponent"}-player-${key}`)
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "nearest",
        inline: "center",
      });
  }

  const switchButtonStyle = hasImportedTeam
    ? {
        fontSize: "clamp(10px, 3.5cqw, 16px)",
        padding: "8px 2px",
        overflowWrap: "anywhere" as const,
      }
    : undefined;

  const substituteCount = Math.min(
    7,
    (benchPlayers ?? []).filter((player) => !isUnavailable(player.availability))
      .length,
  );
  const reserveCount = Math.max(
    0,
    (benchPlayers?.length ?? 0) - substituteCount,
  );
  const benchRowCount = Math.max(3, 1 + 2 * Math.ceil(reserveCount / 7));
  const fieldImage = getFieldImage(stadiumId);
  const bySlot = new Map(
    players?.map((player) => [player.slotId, player]) ?? [],
  );

  return (
    <section
      className={styles.formationSection}
      style={{ alignSelf: hasImportedTeam ? "start" : "center" }}
      aria-label="Team Formation, Player Types and Movement"
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          justifyContent: "center",
          gap: 6,
          width: "100%",
          marginBottom: 14,
          containerType: "inline-size",
        }}
      >
        <div
          className={chartStyles.chartSwitch}
          style={{
            flex: "1 1 370px",
            minWidth: 0,
            maxWidth: 370,
            width: "auto",
            margin: 0,
            boxSizing: "border-box",
          }}
          role="group"
          aria-label="Team view"
        >
          <button
            type="button"
            className={`${chartStyles.chartSwitchButton} ${
              chartMode === "formation" ? chartStyles.chartSwitchActive : ""
            }`}
            style={switchButtonStyle}
            aria-pressed={chartMode === "formation"}
            onClick={() => {
              setSelectedTeam("opponent");
              setSelectedPlayerKey(null);
              setChartMode("formation");
            }}
          >
            Formation
          </button>
          <button
            type="button"
            className={`${chartStyles.chartSwitchButton} ${
              chartMode === "types" ? chartStyles.chartSwitchActive : ""
            }`}
            style={switchButtonStyle}
            aria-pressed={chartMode === "types"}
            onClick={() => setChartMode("types")}
          >
            Player Types
          </button>
          <button
            type="button"
            className={`${chartStyles.chartSwitchButton} ${
              chartMode === "movement" ? chartStyles.chartSwitchActive : ""
            }`}
            style={switchButtonStyle}
            aria-pressed={chartMode === "movement"}
            onClick={() => setChartMode("movement")}
          >
            Movement
          </button>
        </div>
        {hasImportedTeam && (
          <button
            type="button"
            className={`${chartStyles.chartSwitchButton} ${chartStyles.chartSwitchActive}`}
            style={{
              flex: "0 0 52px",
              minWidth: 0,
              fontSize: "clamp(10px, 3.5cqw, 16px)",
              overflowWrap: "anywhere",
              padding: "8px 2px",
              border: "2px solid var(--font_black)",
              borderRadius: 12,
              background:
                chartMode === "formation"
                  ? "var(--button_grey)"
                  : "var(--color-highlight)",
              color:
                chartMode === "formation"
                  ? "var(--font_black)"
                  : "var(--font_white)",
              cursor: chartMode === "formation" ? "not-allowed" : "pointer",
            }}
            disabled={chartMode === "formation"}
            title={
              chartMode === "formation"
                ? "Opponent formation only"
                : `Switch to ${
                    showOwnTeam ? opponentAbbr : ownAbbr ?? "own team"
                  }`
            }
            aria-label={
              chartMode === "formation"
                ? `Opponent: ${opponentAbbr}`
                : `Switch to ${
                    showOwnTeam ? opponentAbbr : ownAbbr ?? "own team"
                  }`
            }
            onClick={() => {
              setSelectedTeam(showOwnTeam ? "opponent" : "own");
              setSelectedPlayerKey(null);
            }}
          >
            {showOwnTeam ? ownAbbr ?? "—" : opponentAbbr}
          </button>
        )}
      </div>

      {chartMode !== "formation" ? (
        <>
          {chartMode === "types" ? (
            <div className={labels.chartContainer}>
              <TypesChart
                players={chartPlayers}
                selectedPlayerKey={activePlayerKey}
                language={language}
                showDescription={false}
                onSelectPlayer={handleChartSelect}
              />
            </div>
          ) : (
            <div className={labels.chartContainer}>
              <MovementChart
                players={movementPlayers}
                selectedPlayerKey={activePlayerKey}
                onSelectPlayer={handleChartSelect}
                showDescription={false}
              />
            </div>
          )}
          {chartLoading ? (
            <div className={labels.caption}>Loading opponent players…</div>
          ) : !showOwnTeam &&
            players === undefined &&
            benchPlayers === undefined ? (
            <div className={labels.caption}>
              Import a save to display{" "}
              {chartMode === "movement"
                ? "opponent movement"
                : "opponent player types"}
              .
            </div>
          ) : !showOwnTeam && typeProfileError ? (
            <div className={labels.caption} role="alert">
              Unable to load TeamPlayerTypes: {typeProfileError}
            </div>
          ) : visibleChartPlayers.length === 0 ? (
            <div className={labels.caption}>
              No {showOwnTeam ? "own team" : "opponent"}{" "}
              {chartMode === "movement" ? "movement" : "type"} coordinates
              available.
            </div>
          ) : (
            <>
              {missingCoordinates > 0 && (
                <div className={labels.caption}>
                  Missing {showOwnTeam ? "save" : "team profile"} coordinates
                  for {missingCoordinates} players.
                </div>
              )}
              {!showOwnTeam && chartMode === "types" && hasTypeMismatch && (
                <div className={labels.caption}>
                  Some saved types differ from their team template coordinates.
                </div>
              )}
            </>
          )}
        </>
      ) : slots.length === 0 ? (
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
                <div
                  className={labels.benchGrid}
                  style={
                    benchRowCount > 3
                      ? {
                          gridTemplateRows: `repeat(${benchRowCount}, 5.73cqw)`,
                          backgroundImage: `repeating-linear-gradient(to right, rgba(40, 90, 40, 0.58) 0, rgba(40, 90, 40, 0.58) 1px, transparent 1px, transparent calc(100% / 15)), repeating-linear-gradient(to bottom, rgba(40, 90, 40, 0.58) 0, rgba(40, 90, 40, 0.58) 1px, transparent 1px, transparent calc(100% / ${benchRowCount}))`,
                        }
                      : undefined
                  }
                >
                  {benchPlayers.map((player, index) => (
                    <div
                      key={player.playerId}
                      className={labels.benchSlot}
                      style={{
                        gridColumn:
                          ((index < substituteCount
                            ? index
                            : index - substituteCount) %
                            7) *
                            2 +
                          2,
                        gridRow:
                          index < substituteCount
                            ? 1
                            : 3 + 2 * Math.floor((index - substituteCount) / 7),
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
          <div className={styles.formationName}>{getFormationName(slots)}</div>
          {players !== undefined && (
            <div className={labels.caption}>Probable starting XI</div>
          )}
        </>
      )}
    </section>
  );
}
