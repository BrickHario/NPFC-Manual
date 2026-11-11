"use client";

import { useEffect, useRef } from "react";
import { usePotentialCurves } from "./PotentialCurvesProvider";
import styles from "./TypePlayers.module.css";
import Image from "next/image";
import Link from "next/link";
import {
  attributeImages,
  calculateAttributes,
  getFatigueColor,
  getFatigueProgress,
  rankImages,
} from "../../lib/utils";

export type PlayerDisplay = {
  id: number | null;
  name: string;
  isImported?: boolean;
  developmentWeeks?: number;
  trainingCount?: number;
  potentialOffsetWeeks?: number | null;
  imageUrl: string;
  x: number;
  y: number;
  typeColor: string;
  finalX: number;
  finalY: number;
  finalType: string;
  finalTypeColor: string;
  startAttributes: ReturnType<typeof calculateAttributes>;
  finalAttributes: ReturnType<typeof calculateAttributes>;
  startPots: number[];
  startPosition: { x: number; y: number };
  path: { x: number; y: number }[];
  potentialPercent?: number;
  xOverflow: number;
yOverflow: number;
fatigue: number | null;
weeklyRecovery: number | null;
};

type TypePlayersProps = {
  players: PlayerDisplay[];
  selectedPlayerKey: string | null;
  onSelectPlayer: (key: string) => void;
  onRemovePlayer: (id: number) => void;
  onPositionChange: (id: number | null, axis: "x" | "y", value: number) => void;
  clampCoordinate: (value: number) => number;
  getPlayerType: (x: number, y: number) => string;
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

function getAttributeImage(name: string, index: number): string {
  const value = name.toLowerCase().trim();

  if (/shoot|shot|schuss/.test(value)) return "/shoot-icon.png";
  if (/speed|tempo|pace/.test(value)) return "/run-icon.png";
  if (/stamina|ausdauer|endurance/.test(value)) return "/stamina-icon.png";
  if (/technic|techni|technik|skill/.test(value)) return "/technic-icon.png";
  if (/strength|kraft|power/.test(value)) return "/strenght-icon.png";
  if (/jump|sprung/.test(value)) return "/jump-icon.png";
  if (/will|wille|mental/.test(value)) return "/will-icon.png";

  return attributeImages[index] ?? "/will-icon.png";
}

export function TypePlayers({
  players,
  selectedPlayerKey,
  onSelectPlayer,
  onRemovePlayer,
  onPositionChange,
  clampCoordinate,
  getPlayerType,
}: TypePlayersProps) {

  const playerListRef = useRef<HTMLUListElement>(null);

  const dbCurves = usePotentialCurves();

useEffect(() => {
  if (!selectedPlayerKey || !playerListRef.current) return;

  const list = playerListRef.current;

  const selectedElement = Array.from(list.children).find(
    (element) =>
      element.getAttribute("data-player-key") === selectedPlayerKey
  ) as HTMLElement | undefined;

  if (!selectedElement) return;

  const listRect = list.getBoundingClientRect();
  const itemRect = selectedElement.getBoundingClientRect();

  if (itemRect.left < listRect.left) {
    list.scrollLeft -= listRect.left - itemRect.left;
  } else if (itemRect.right > listRect.right) {
    list.scrollLeft += itemRect.right - listRect.right;
  }
}, [selectedPlayerKey]);
  return (
    <aside
  className={`${styles.players} ${
    players.length > 2 ? styles.hoverEnabled : ""
  }`}
>
      <h2>Players</h2>

      <ul
  ref={playerListRef}
  className={styles.playerList}
>
        {[...players].reverse().map((player) => {
          const playerKey = player.id === null ? "dummy" : String(player.id);
          const isSelected = selectedPlayerKey === playerKey;
          const curve = player.id === null
            ? dbCurves.dummy
            : dbCurves.players[player.id];

          const trainingWeeks = player.trainingCount ?? player.path.length;
          const developmentWeeks = Math.min(
            384,
            Math.max(0, (player.isImported ? player.developmentWeeks ?? 0 : 0) + trainingWeeks)
          );

          const curvePosition = developmentWeeks / 12;
          const curveIndex = Math.min(32, Math.floor(curvePosition));
          const nextCurveIndex = Math.min(32, curveIndex + 1);
          const dbPotentialPercent = curve
            ? curve[curveIndex] +
              (curve[nextCurveIndex] - curve[curveIndex]) * (curvePosition - curveIndex)
            : undefined;
          const potentialPercent = dbPotentialPercent ?? player.potentialPercent;

          return (
        <li
          className={`${styles.player} ${isSelected ? styles.selectedPlayer : ""}`}
          data-player-key={playerKey}
          key={playerKey}
          tabIndex={0}
          onClick={() => onSelectPlayer(playerKey)}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelectPlayer(playerKey);
            }
          }}
          aria-label={`${player.name}${isSelected ? ", selected" : ", select player"}`}
        >
          {player.id !== null && (
            <>
              <Link
                href={`/marketplace?sort=overall_desc&page=1&id=${player.id}`}
                className={styles.infoButton}
                aria-label={`View ${player.name} information`}
                title="Player info"
                onClick={(event) => event.stopPropagation()}
              >i</Link>
              <button
                type="button"
                className={styles.removePlayer}
                aria-label={`Remove ${player.name}`}
                title="Remove player"
                onClick={(event) => {
                  event.stopPropagation();
                  if (player.id !== null) onRemovePlayer(player.id);
                }}
              >×</button>
            </>
          )}
          <span
            className={styles.potentialOffset}
            title="Current development time and potential curve value"
          >
            <span>
              {(developmentWeeks / 48).toFixed(2)}y
            </span>
            <span style={{ display: "block" }}>
              {potentialPercent !== undefined && Number.isFinite(potentialPercent)
                ? `(${potentialPercent.toFixed(1)}%)`
                : "(…)"}
            </span>
          </span>
            <div
              className={styles.fatigueHud}
              title={`Fatigue ${player.fatigue} · Recovery ${player.weeklyRecovery ?? 0}/w`}
              onClick={(event) => event.stopPropagation()}
            >
              <span className={styles.fatigueRecovery}>
                -{player.weeklyRecovery ?? 0}/w
              </span>
              <div className={styles.fatigueMeter}>
                <div className={styles.fatigueTail}>
                  <span
                    className={styles.fatigueMarker}
                    style={{ left: `${getFatigueProgress(player.fatigue)}%` }}
                  />
                </div>
                <Image
  src={`/fatigueIcon-${getFatigueColor(player.fatigue)}.png`}
  alt={`Fatigue: ${getFatigueColor(player.fatigue)}`}
  width={20}
  height={20}
  className={styles.fatigueDot}
  unoptimized
/>
              </div>
            </div>
          
          <div className={styles.playerHeading}>
            <span className={styles.playerName}>{player.name}</span>
                   <div className={styles.playerImage}>
    <Image
      src={player.imageUrl}
      alt={player.name}
      fill
      sizes="64px"
      unoptimized
      style={{ objectFit: "contain", imageRendering: "pixelated" }}
    />
  </div>
            <div className={styles.typeColumn}>
              <p className={styles.playerType} style={{ color: player.typeColor }}>
                {getPlayerType(player.x, player.y)}
              </p>
              <div className={styles.resultType}>
                <span className={styles.downArrow}>⌄</span>
                <span style={{ color: player.finalTypeColor }}>{player.finalType}</span>
              </div>
            </div>

            <div className={styles.coordinatesColumn}>
 {
  (player.xOverflow !== 0 || player.yOverflow !== 0) && (
    <div className={styles.overhang}>
      {player.xOverflow !== 0 && (
        <span
          className={
            player.xOverflow > 0
              ? styles.positiveOverhang
              : styles.negativeOverhang
          }
        >
          X {player.xOverflow > 0 ? "+" : ""}
          {player.xOverflow}
        </span>
      )}

      {player.yOverflow !== 0 && (
        <span
          className={
            player.yOverflow > 0
              ? styles.positiveOverhang
              : styles.negativeOverhang
          }
        >
          Y {player.yOverflow > 0 ? "+" : ""}
          {player.yOverflow}
        </span>
      )}
    </div>
  )}
            <div className={styles.coordinatesRow}>
  {player.isImported ? (
    <span className={styles.resultCoordinates}>
      X {player.x} / Y {player.y}
    </span>
  ) : (
    <>
      <label className={styles.coordinate}>
        X
        <input
          onClick={(event) => event.stopPropagation()}
          type="number"
          min={0}
          max={100}
          step={1}
          value={player.x}
          onChange={(event) => {
            const value = event.currentTarget.valueAsNumber;
            if (Number.isFinite(value)) {
              onPositionChange(player.id, "x", clampCoordinate(value));
            }
          }}
          aria-label={`${player.name} X-Koordinate`}
        />
      </label>

      <label className={styles.coordinate}>
        Y
        <input
          onClick={(event) => event.stopPropagation()}
          type="number"
          min={0}
          max={100}
          step={1}
          value={player.y}
          onChange={(event) => {
            const value = event.currentTarget.valueAsNumber;
            if (Number.isFinite(value)) {
              onPositionChange(player.id, "y", clampCoordinate(value));
            }
          }}
          aria-label={`${player.name} Y-Koordinate`}
        />
      </label>
    </>
  )}
</div>
              <div className={styles.resultCoordinates}>
                <span className={styles.downArrow}>⌄</span>
                <span>X {player.finalX} / Y {player.finalY}</span>
              </div>
            </div>

            <div className={styles.skillsGrid}>
              {player.startAttributes.slice(0, 7).map((attribute, index) => {
                const startGrade = String(attribute.grade ?? "—")
                  .trim()
                  .toUpperCase();
                const finalGrade = String(
                  player.finalAttributes[index]?.grade ?? startGrade
                )
                  .trim()
                  .toUpperCase();

                const startImage = rankImages[startGrade];
                const finalImage = rankImages[finalGrade];
                const finalAttribute = player.finalAttributes[index] ?? attribute;
                const startProgress = getLevelProgress(
                  attribute.value,
                  attribute.level
                );
                const finalProgress = getLevelProgress(
                  finalAttribute.value,
                  finalAttribute.level
                );

                return (
                  <div
                    className={styles.skillItem}
                    key={`${attribute.name}-${index}`}
                    title={String(attribute.name)}
                  >
                    <Image
                      src={getAttributeImage(String(attribute.name), index)}
                      alt={String(attribute.name)}
                      width={46}
                      height={46}
                      unoptimized
                      className={styles.skillIcon}
                    />

                    <div className={styles.gradeSlot}>
                      <div
                        className={styles.skillGrade}
                        title={`${attribute.name}: ${startGrade} (${attribute.value})`}
                      >
                        {startImage ? (
                          <Image
                            src={startImage}
                            alt={`Rating ${startGrade}`}
                            width={15}
                            height={15}
                            unoptimized
                            className={styles.rankImage}
                          />
                        ) : (
                          <span>{startGrade}</span>
                        )}
                      </div>
                      <div
                        className={styles.levelTrack}
                        role="progressbar"
                        aria-label={`${attribute.name}: ${Math.round(startProgress)}%`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(startProgress)}
                      >
                        <span
                          className={styles.levelDot}
                          style={{ bottom: `${startProgress}%` }}
                        />
                      </div>
                    </div>

                    <span className={styles.downArrow}>⌄</span>

                    <div className={styles.gradeSlot}>
                      <div
                        className={styles.skillGrade}
                        title={`${attribute.name}: ${finalGrade} (${finalAttribute.value})`}
                      >
                        {finalImage ? (
                          <Image
                            src={finalImage}
                            alt={`Rating ${finalGrade}`}
                            width={15}
                            height={15}
                            unoptimized
                            className={styles.rankImage}
                          />
                        ) : (
                          <span>{finalGrade}</span>
                        )}
                      </div>
                      <div
                        className={styles.levelTrack}
                        role="progressbar"
                        aria-label={`${attribute.name}: ${Math.round(finalProgress)}%`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(finalProgress)}
                      >
                        <span
                          className={styles.levelDot}
                          style={{ bottom: `${finalProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </li>
          );
        })}
      </ul>
    </aside>
  );
}
