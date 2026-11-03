
import styles from "./TypePlayers.module.css";

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
};

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
          </div>
        </li>
      </ul>
    </aside>
  );
}
