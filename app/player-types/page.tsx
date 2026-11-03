
"use client";

import { Suspense, useEffect, useState } from "react";
import TypesChart from "./TypesChart";
import { playerTypeRows } from "./player-type-data";
import {
  PLAYER_TYPE_COLORS,
  PLAYER_TYPE_NAMES,
  getSavedLanguage,
  type Language,
} from "../../lib/utils";
import styles from "./TypesChart.module.css";
import { TypePlayers } from "./TypePlayers";
import LanguageSwitcher from "../LanguageSwitcher";

function clampCoordinate(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function Home() {
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    setLanguage(getSavedLanguage());
  }, []);

  function getPlayerType(x: number, y: number) {
    const row = playerTypeRows[y];

    for (let i = 0; i < row.length; i += 2) {
      if (x <= row[i]) {
        return PLAYER_TYPE_NAMES[language][row[i + 1]];
      }
    }

    return PLAYER_TYPE_NAMES[language][0];
  }

  
function getPlayerTypeId(x: number, y: number): number {
  const row = playerTypeRows[y];

  for (let i = 0; i < row.length; i += 2) {
    if (x <= row[i]) return row[i + 1];
  }

  return 0;
}


  return (
    <main className={styles.pageContent}>
      <Suspense>
        <div className={styles.languageDock}>
          <LanguageSwitcher />
        </div>

        <div className={styles.layout}>
          <h1 className={styles.heading}>Player Types</h1>

          <TypePlayers
            setX={setX}
            setY={setY}
            clampCoordinate={clampCoordinate}
            getPlayerType={getPlayerType}
            x={x}
            y={y}
            typeColor={PLAYER_TYPE_COLORS[getPlayerTypeId(x, y)]}
          />

          <section className={styles.chartColumn}>
            <TypesChart player={{ x, y }} language={language} />
          </section>
        </div>
      </Suspense>
    </main>
  );
}
