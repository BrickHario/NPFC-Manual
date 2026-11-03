
import styles from "./TypePlayers.module.css";

type TypePlayersProps = {
  setX: (value: number) => void;
  setY: (value: number) => void;
  clampCoordinate: (value: number) => number;
  getPlayerType: (x: number, y: number) => string;
  x: number;
  y: number;
};

export function TypePlayers({
  setX,
  setY,
  clampCoordinate,
  getPlayerType,
  x,
  y,
}: TypePlayersProps) {
  return (
    <aside className={styles.players}>
      <h2>Players</h2>
      <ul className={styles.playerList}>
        <li className={styles.player}>
          <div className={styles.playerHeading}>
            <span className={styles.playerName}>Dummy</span>
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
                  if (Number.isFinite(value)) setX(clampCoordinate(value));
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
                  if (Number.isFinite(value)) setY(clampCoordinate(value));
                }}
                aria-label="Dummy Y-Koordinate"
              />
            </label>
            <p className={styles.playerType}>{getPlayerType(x, y)}</p>
          </div>
        </li>
      </ul>
    </aside>
  );
}
