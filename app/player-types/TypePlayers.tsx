
import styles from "./TypePlayers.module.css";
import Image from "next/image";
import Link from "next/link";
import {
  attributeImages,
  calculateAttributes,
  rankImages,
} from "../../lib/utils";

type TypePlayersProps = {
  playerName: string;
  playerImageUrl: string;
  playerId: number | null;
  onRemovePlayer: () => void;
  setX: (value: number) => void;
  setY: (value: number) => void;
  clampCoordinate: (value: number) => number;
  getPlayerType: (
    x: number,
    y: number
  ) => string;
  x: number;
  y: number;
  typeColor: string;
  finalX: number;
  finalY: number;
  finalType: string;
  finalTypeColor: string;
  startAttributes: ReturnType<
    typeof calculateAttributes
  >;
  finalAttributes: ReturnType<
    typeof calculateAttributes
  >;
};

const LEVEL_THRESHOLDS = [
  0,
  50,
  150,
  350,
  600,
  1000,
] as const;

function getLevelProgress(
  value: number,
  level: number
): number {
  if (
    level >= LEVEL_THRESHOLDS.length - 1
  ) {
    return 100;
  }

  if (
    level < 0 ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  const min = LEVEL_THRESHOLDS[level];
  const max = LEVEL_THRESHOLDS[level + 1];

  if (
    min === undefined ||
    max === undefined
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      ((value - min) / (max - min)) * 100
    )
  );
}

function getAttributeImage(
  name: string,
  index: number
): string {
  const value = name.toLowerCase().trim();

  if (/shoot|shot|schuss/.test(value)) {
    return "/shoot-icon.png";
  }

  if (/speed|tempo|pace/.test(value)) {
    return "/run-icon.png";
  }

  if (/stamina|ausdauer|endurance/.test(value)) {
    return "/stamina-icon.png";
  }

  if (/technic|techni|technik|skill/.test(value)) {
    return "/technic-icon.png";
  }

  if (/strength|kraft|power/.test(value)) {
    return "/strenght-icon.png";
  }

  if (/jump|sprung/.test(value)) {
    return "/jump-icon.png";
  }

  if (/will|wille|mental/.test(value)) {
    return "/will-icon.png";
  }

  return (
    attributeImages[index] ??
    "/will-icon.png"
  );
}

export function TypePlayers({
  playerName,
  playerImageUrl,
  playerId,
  onRemovePlayer,
  setX,
  setY,
  clampCoordinate,
  getPlayerType,
  x,
  y,
  typeColor,
  finalX,
  finalY,
  finalType,
  finalTypeColor,
  startAttributes,
  finalAttributes,
}: TypePlayersProps) {
  return (
    <aside className={styles.players}>
      <h2>Players</h2>

      <ul className={styles.playerList}>
        <li className={styles.player}>
          {playerId !== null && (
            <>
              <Link
                href={`/marketplace?sort=overall_desc&page=1&id=${playerId}`}
                className={styles.infoButton}
                aria-label={`View ${playerName} information`}
                title="Player info"
              >
                i
              </Link>

              <Link
                href="/player-types"
                className={styles.removePlayer}
                aria-label={`Remove ${playerName}`}
                title="Remove player"
                onClick={onRemovePlayer}
              >
                ×
              </Link>
            </>
          )}

          <div className={styles.playerHeading}>
            <span
              className={styles.playerName}
            >
              {playerName}
            </span>

            <div
              className={styles.playerImage}
            >
              <Image
                key={playerImageUrl}
                src={playerImageUrl}
                alt={playerName}
                fill
                sizes="64px"
                unoptimized
                style={{
                  objectFit: "contain",
                  imageRendering: "pixelated",
                }}
              />
            </div>

            <div
              className={styles.typeColumn}
            >
              <p
                className={styles.playerType}
                style={{ color: typeColor }}
              >
                {getPlayerType(x, y)}
              </p>

              <div
                className={styles.resultType}
              >
                <span
                  className={styles.downArrow}
                >
                  ⌄
                </span>

                <span
                  style={{
                    color: finalTypeColor,
                  }}
                >
                  {finalType}
                </span>
              </div>
            </div>

            <div
              className={
                styles.coordinatesColumn
              }
            >
              <div
                className={
                  styles.coordinatesRow
                }
              >
                <label
                  className={
                    styles.coordinate
                  }
                >
                  X

                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={x}
                    onChange={(event) => {
                      const value =
                        event.currentTarget
                          .valueAsNumber;

                      if (
                        Number.isFinite(value)
                      ) {
                        setX(
                          clampCoordinate(value)
                        );
                      }
                    }}
                    aria-label={`${playerName} X-Koordinate`}
                  />
                </label>

                <label
                  className={
                    styles.coordinate
                  }
                >
                  Y

                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={y}
                    onChange={(event) => {
                      const value =
                        event.currentTarget
                          .valueAsNumber;

                      if (
                        Number.isFinite(value)
                      ) {
                        setY(
                          clampCoordinate(value)
                        );
                      }
                    }}
                    aria-label={`${playerName} Y-Koordinate`}
                  />
                </label>
              </div>

              <div
                className={
                  styles.resultCoordinates
                }
              >
                <span
                  className={styles.downArrow}
                >
                  ⌄
                </span>

                <span>
                  X {finalX} / Y {finalY}
                </span>
              </div>
            </div>

            <div
              className={styles.skillsGrid}
            >
              {startAttributes
                .slice(0, 7)
                .map(
                  (attribute, index) => {
                    const startGrade =
                      String(
                        attribute.grade ??
                          "—"
                      )
                        .trim()
                        .toUpperCase();

                    const finalAttribute =
                      finalAttributes[
                        index
                      ] ?? attribute;

                    const finalGrade =
                      String(
                        finalAttribute.grade ??
                          startGrade
                      )
                        .trim()
                        .toUpperCase();

                    const startImage =
                      rankImages[
                        startGrade
                      ];

                    const finalImage =
                      rankImages[
                        finalGrade
                      ];

                    const startProgress =
                      getLevelProgress(
                        attribute.value,
                        attribute.level
                      );

                    const finalProgress =
                      getLevelProgress(
                        finalAttribute.value,
                        finalAttribute.level
                      );

                    return (
                      <div
                        className={
                          styles.skillItem
                        }
                        key={`${attribute.name}-${index}`}
                        title={String(
                          attribute.name
                        )}
                      >
                        <Image
                          src={getAttributeImage(
                            String(
                              attribute.name
                            ),
                            index
                          )}
                          alt={String(
                            attribute.name
                          )}
                          width={46}
                          height={46}
                          unoptimized
                          className={
                            styles.skillIcon
                          }
                        />

                        <div
                          className={
                            styles.gradeSlot
                          }
                        >
                          <div
                            className={
                              styles.skillGrade
                            }
                            title={`${attribute.name}: ${startGrade} (${attribute.value})`}
                          >
                            {startImage ? (
                              <Image
                                src={
                                  startImage
                                }
                                alt={`Rating ${startGrade}`}
                                width={15}
                                height={15}
                                unoptimized
                                className={
                                  styles.rankImage
                                }
                              />
                            ) : (
                              <span>
                                {
                                  startGrade
                                }
                              </span>
                            )}
                          </div>

                          <div
                            className={
                              styles.levelTrack
                            }
                            role="progressbar"
                            aria-label={`${attribute.name}: ${Math.round(startProgress)}%`}
                            aria-valuemin={
                              0
                            }
                            aria-valuemax={
                              100
                            }
                            aria-valuenow={Math.round(
                              startProgress
                            )}
                          >
                            <span
                              className={
                                styles.levelDot
                              }
                              style={{
                                bottom: `${startProgress}%`,
                              }}
                            />
                          </div>
                        </div>

                        <span
                          className={
                            styles.downArrow
                          }
                        >
                          ⌄
                        </span>

                        <div
                          className={
                            styles.gradeSlot
                          }
                        >
                          <div
                            className={
                              styles.skillGrade
                            }
                            title={`${attribute.name}: ${finalGrade} (${finalAttribute.value})`}
                          >
                            {finalImage ? (
                              <Image
                                src={
                                  finalImage
                                }
                                alt={`Rating ${finalGrade}`}
                                width={15}
                                height={15}
                                unoptimized
                                className={
                                  styles.rankImage
                                }
                              />
                            ) : (
                              <span>
                                {
                                  finalGrade
                                }
                              </span>
                            )}
                          </div>

                          <div
                            className={
                              styles.levelTrack
                            }
                            role="progressbar"
                            aria-label={`${attribute.name}: ${Math.round(finalProgress)}%`}
                            aria-valuemin={
                              0
                            }
                            aria-valuemax={
                              100
                            }
                            aria-valuenow={Math.round(
                              finalProgress
                            )}
                          >
                            <span
                              className={
                                styles.levelDot
                              }
                              style={{
                                bottom: `${finalProgress}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
            </div>
          </div>
        </li>
      </ul>
    </aside>
  );
}
