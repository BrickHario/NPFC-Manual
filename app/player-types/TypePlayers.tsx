
import styles from "./TypePlayers.module.css";
import Image from "next/image";
import {
  attributeImages,
  calculateAttributes,
  rankImages,
} from "../../lib/utils";

type TypePlayersProps = {
  setX: (value: number) => void;
  setY: (value: number) => void;
  clampCoordinate: (value: number) => number;
  getPlayerType: (x: number, y: number) => string;
  x: number;
  y: number;
  typeColor: string;
  finalX: number;
  finalY: number;
  finalType: string;
  finalTypeColor: string;
  startAttributes: ReturnType<typeof calculateAttributes>;
finalAttributes: ReturnType<typeof calculateAttributes>;
};


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
          <div className={styles.playerHeading}>
            <span className={styles.playerName}>Dummy</span>

            <div className={styles.coordinatesColumn}>
              <div className={styles.coordinatesRow}>
                <label className={styles.coordinate}>
                  X
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={x}
                    onChange={(event) => {
                      const value = event.currentTarget.valueAsNumber;
                      if (Number.isFinite(value)) {
                        setX(clampCoordinate(value));
                      }
                    }}
                    aria-label="Dummy X-Koordinate"
                  />
                </label>

                <label className={styles.coordinate}>
                  Y
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={y}
                    onChange={(event) => {
                      const value = event.currentTarget.valueAsNumber;
                      if (Number.isFinite(value)) {
                        setY(clampCoordinate(value));
                      }
                    }}
                    aria-label="Dummy Y-Koordinate"
                  />
                </label>
              </div>

                <div className={styles.resultCoordinates}>
                  <span className={styles.downArrow}>⌄</span>
                  <span>
                    X {finalX} / Y {finalY}
                  </span>
                </div>
            </div>

            <div className={styles.typeColumn}>
              <p
                className={styles.playerType}
                style={{ color: typeColor }}
              >
                {getPlayerType(x, y)}
              </p>

                <div className={styles.resultType}>
                  <span className={styles.downArrow}>⌄</span>
                  <span style={{ color: finalTypeColor }}>
                    {finalType}
                  </span>
                </div>
            </div>
  
<div className={styles.skillsGrid}>
  {startAttributes.slice(0, 7).map((attribute, index) => {
    const startGrade = String(attribute.grade ?? "—")
      .trim()
      .toUpperCase();

    const finalGrade = String(
      finalAttributes[index]?.grade ?? startGrade
    )
      .trim()
      .toUpperCase();

    const startImage = rankImages[startGrade];
    const finalImage = rankImages[finalGrade];

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
          <>
            <span className={styles.downArrow} style={{transform: "translateY(-7px)"}}>⌄</span>

            <div
              className={styles.skillGrade}
              title={`${attribute.name}: ${finalGrade} (${finalAttributes[index]?.value ?? attribute.value})`}
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
          </>
      </div>
    );
  })}
</div>

          </div>
        </li>
      </ul>
    </aside>
  );
}
