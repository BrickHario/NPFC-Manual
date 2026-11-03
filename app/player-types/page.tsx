
"use client";

import { Suspense, useState } from "react";
import TypesChart from "./TypesChart";
import { playerTypeNames, playerTypeRows } from "./player-type-data";
import styles from "./TypesChart.module.css";
import { TypePlayers } from "./TypePlayers";

function clampCoordinate(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getPlayerType(x: number, y: number) {
  const row = playerTypeRows[y];
  for (let i = 0; i < row.length; i += 2) {
    if (x <= row[i]) return playerTypeNames[row[i + 1]];
  }
  return playerTypeNames[0];
}

export default function Home() {
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);

  return (
    <main>
      <Suspense>
        <div className={styles.layout}>
          <h1 className={styles.heading}>Player Types</h1>

          <TypePlayers
            setX={setX}
            setY={setY}
            clampCoordinate={clampCoordinate}
            getPlayerType={getPlayerType}
            x={x}
            y={y}
          />

          <section className={styles.chartColumn}>
            <TypesChart player={{ x, y }} />
          </section>
        </div>
      </Suspense>
    </main>
  );
}
