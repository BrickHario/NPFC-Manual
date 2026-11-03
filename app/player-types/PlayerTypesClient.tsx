"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import type {
  SelectedTraining,
  TrainingEntry,
} from "./training-types";
import TypesChart from "./TypesChart";
import { playerTypeRows } from "./player-type-data";
import {
  PLAYER_TYPE_COLORS,
  PLAYER_TYPE_NAMES,
  type Language,
} from "../../lib/utils";
import {
  applyTrainingPots,
  calculatePlayerPosition,
} from "./player-type-calculation";
import styles from "./TypesChart.module.css";
import { TypePlayers } from "./TypePlayers";
import LanguageSwitcher from "../LanguageSwitcher";
import TrainingSelectFilter from "./TrainingSelectFilter";

const initialPots = Array(12).fill(50) as number[];

function clampCoordinate(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function PlayerTypesClient({
  trainings,
  initialLanguage,
}: {
  trainings: TrainingEntry[];
  initialLanguage: Language;
}) {
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [language] = useState<Language>(initialLanguage);
  const [selectedTrainings, setSelectedTrainings] = useState<
    SelectedTraining[]
  >([]);

  const trainingCatalog = useMemo(
    () =>
      new Map(
        trainings.map((entry) => [
          `${entry.kind}:${entry.id}`,
          entry,
        ])
      ),
    [trainings]
  );

  const handleSelectionChange = useCallback(
    (items: SelectedTraining[]) => {
      setSelectedTrainings(items);
    },
    []
  );

  const trainingPath = useMemo(() => {
    if (selectedTrainings.length === 0) {
      return [];
    }

    const start = calculatePlayerPosition(initialPots);
    let currentPots = [...initialPots];
    const points: { x: number; y: number }[] = [];

    for (const item of selectedTrainings) {
      const entry = trainingCatalog.get(
        `${item.kind}:${item.id}`
      );

      if (!entry) continue;

      currentPots = applyTrainingPots(currentPots, [
        entry.potChanges,
      ]);

      const currentPosition =
        calculatePlayerPosition(currentPots);

      points.push({
        x: clampCoordinate(
          x + currentPosition.x - start.x
        ),
        y: clampCoordinate(
          y + currentPosition.y - start.y
        ),
      });
    }

    return points;
  }, [selectedTrainings, trainingCatalog, x, y]);

  function getPlayerTypeId(
    playerX: number,
    playerY: number
  ): number {
    const row = playerTypeRows[playerY];

    for (let i = 0; i < row.length; i += 2) {
      if (playerX <= row[i]) {
        return row[i + 1];
      }
    }

    return 0;
  }

  function getPlayerType(
    playerX: number,
    playerY: number
  ) {
    return PLAYER_TYPE_NAMES[language][
      getPlayerTypeId(playerX, playerY)
    ];
  }

  const finalPosition =
  trainingPath.length > 0
    ? trainingPath[trainingPath.length - 1]
    : { x, y };

const finalTypeId = getPlayerTypeId(
  finalPosition.x,
  finalPosition.y
);

  return (
    <main className={styles.pageContent}>
      <Suspense>
        <div className={styles.languageDock}>
          <LanguageSwitcher />
        </div>

        <div className={styles.layout}>
          <h1 className={styles.heading}>
            Player Types
          </h1>

<TypePlayers
  setX={setX}
  setY={setY}
  clampCoordinate={clampCoordinate}
  getPlayerType={getPlayerType}
  x={x}
  y={y}
  typeColor={PLAYER_TYPE_COLORS[getPlayerTypeId(x, y)]}
  finalX={finalPosition.x}
  finalY={finalPosition.y}
  finalType={getPlayerType(finalPosition.x, finalPosition.y)}
  finalTypeColor={PLAYER_TYPE_COLORS[finalTypeId]}
/>

          <section className={styles.chartColumn}>
            <TypesChart
              player={{ x, y }}
              path={trainingPath}
              language={language}
            />
          </section>

          <TrainingSelectFilter
            language={language}
            trainings={trainings}
            onSelectionChange={handleSelectionChange}
          />
        </div>
      </Suspense>
    </main>
  );
}