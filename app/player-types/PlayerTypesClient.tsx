
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  SelectedTraining,
  TrainingEntry,
} from "./training-types";
import TypesChart from "./TypesChart";
import { playerTypeRows } from "./player-type-data";
import {
  PLAYER_TYPE_COLORS,
  calculateAttributes,
  PLAYER_TYPE_NAMES,
  type Language,
} from "../../lib/utils";
import {
  calculatePlayerPosition,
  calculateTrainingStep,
} from "./player-type-calculation";
import styles from "./TypesChart.module.css";
import { TypePlayers } from "./TypePlayers";
import LanguageSwitcher from "../LanguageSwitcher";
import TrainingSelectFilter from "./TrainingSelectFilter";

const SKILL_VALUES = [0, 50, 150, 350, 600, 1000] as const;

function clampCoordinate(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function estimatePotsForPosition(
  targetX: number,
  targetY: number
) {
  const baseline = Array<number>(12).fill(50);

  const score = (pots: number[]) => {
    const position = calculatePlayerPosition(pots);

    const positionError =
      (position.x - targetX) ** 2 +
      (position.y - targetY) ** 2;

    const potentialDifference = pots.reduce(
      (sum, value) => sum + (value - 50) ** 2,
      0
    );

    return (
      positionError * 10000 +
      potentialDifference / 12
    );
  };

  let bestPots = [...baseline];
  let bestScore = score(bestPots);

  for (let restart = 0; restart < 4; restart++) {
    let seed =
      (
        12345 +
        restart * 7919 +
        targetX * 101 +
        targetY * 307
      ) >>> 0;

    const random = () => {
      seed =
        (Math.imul(seed, 1664525) + 1013904223) >>> 0;

      return seed / 4294967296;
    };

    const pots =
      restart === 0
        ? [...baseline]
        : baseline.map(
            () =>
              [0, 25, 50, 75, 100][
                Math.floor(random() * 5)
              ]
          );

    let currentScore = score(pots);

    for (const step of [50, 25, 12, 6, 3, 1]) {
      for (let pass = 0; pass < 5; pass++) {
        let changed = false;

        for (let i = 0; i < 12; i++) {
          const original = pots[i];
          let bestValue = original;
          let localBestScore = currentScore;

          for (const sign of [-1, 1]) {
            pots[i] = Math.max(
              0,
              Math.min(100, original + sign * step)
            );

            const candidateScore = score(pots);

            if (candidateScore < localBestScore) {
              localBestScore = candidateScore;
              bestValue = pots[i];
            }
          }

          pots[i] = bestValue;

          if (localBestScore < currentScore) {
            currentScore = localBestScore;
            changed = true;
          }
        }

        if (!changed) break;
      }
    }

    if (currentScore < bestScore) {
      bestScore = currentScore;
      bestPots = [...pots];
    }
  }

  return bestPots;
}

function toSkillRow(values: number[]) {
  const row: Record<string, number> = {};

  for (let i = 0; i < 10; i++) {
    const key = `skill_${String(i + 1).padStart(2, "0")}`;

    row[key] = Number(values[i] ?? 0);
  }

  return row;
}

export type PlayerTypeSelection = {
  id: number;
  name: string;
  imageUrl: string;
  skills: number[];
};

type PlayerTypesClientProps = {
  trainings: TrainingEntry[];
  initialLanguage: Language;
  initialPlayer: PlayerTypeSelection | null;
};

export default function PlayerTypesClient({
  trainings,
  initialLanguage,
  initialPlayer,
}: PlayerTypesClientProps) {
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [language] = useState<Language>(initialLanguage);
  const [selectedTrainings, setSelectedTrainings] =
    useState<SelectedTraining[]>([]);

  useEffect(() => {
    if (initialPlayer) {
      localStorage.setItem(
        "npfc-player-type-id",
        String(initialPlayer.id)
      );
    } else {
      localStorage.removeItem("npfc-player-type-id");
    }
  }, [initialPlayer]);

  const handleRemovePlayer = useCallback(() => {
    localStorage.removeItem("npfc-player-type-id");
  }, []);

  const initialSkills = useMemo(
    () =>
      Array.from(
        { length: 10 },
        (_, index) => Number(initialPlayer?.skills[index] ?? 0)
      ),
    [initialPlayer]
  );

  const initialSkillPoints = useMemo(
    () =>
      initialSkills.map(
        (level) => SKILL_VALUES[level] ?? 0
      ),
    [initialSkills]
  );

  const startPots = useMemo(
    () => estimatePotsForPosition(x, y),
    [x, y]
  );

  const startPosition = useMemo(
    () => calculatePlayerPosition(startPots),
    [startPots]
  );

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
    let currentPots = [...startPots];

    const points: {
      x: number;
      y: number;
    }[] = [];

    for (const item of selectedTrainings) {
      const entry = trainingCatalog.get(
        `${item.kind}:${item.id}`
      );

      if (!entry) continue;

      const step = calculateTrainingStep(
        currentPots,
        entry.potChanges
      );

      currentPots = step.nextPots;
      points.push(step.position);
    }

    return points;
  }, [
    selectedTrainings,
    trainingCatalog,
    startPots,
  ]);

  function getPlayerTypeId(
    playerX: number,
    playerY: number
  ): number {
    const row =
      playerTypeRows[clampCoordinate(playerY)];

    if (!row) return 0;

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

  const skillTotals = useMemo(() => {
    const totals = Array<number>(10).fill(0);

    for (const selected of selectedTrainings) {
      const training = trainingCatalog.get(
        `${selected.kind}:${selected.id}`
      );

      if (!training) continue;

      for (let i = 0; i < 10; i++) {
        totals[i] += Number(
          training.skillChanges[i] ?? 0
        );
      }
    }

    return totals;
  }, [
    selectedTrainings,
    trainingCatalog,
  ]);

  const finalSkillPoints = useMemo(
    () =>
      initialSkillPoints.map(
        (original, index) =>
          Math.max(0, original + skillTotals[index])
      ),
    [initialSkillPoints, skillTotals]
  );

  const startAttributes = useMemo(
    () =>
      calculateAttributes(
        toSkillRow(initialSkillPoints),
        "points"
      ),
    [initialSkillPoints]
  );

  const finalAttributes = useMemo(
    () =>
      calculateAttributes(
        toSkillRow(finalSkillPoints),
        "points"
      ),
    [finalSkillPoints]
  );

  const playerName =
    initialPlayer?.name ?? "Dummy";

  const playerImageUrl =
    initialPlayer?.imageUrl ?? "/Dummy.png";

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
            playerName={playerName}
            playerImageUrl={playerImageUrl}
            playerId={initialPlayer?.id ?? null}
            onRemovePlayer={handleRemovePlayer}
            setX={setX}
            setY={setY}
            clampCoordinate={clampCoordinate}
            getPlayerType={getPlayerType}
            x={x}
            y={y}
            typeColor={
              PLAYER_TYPE_COLORS[
                getPlayerTypeId(x, y)
              ]
            }
            finalX={finalPosition.x}
            finalY={finalPosition.y}
            finalType={getPlayerType(
              finalPosition.x,
              finalPosition.y
            )}
            finalTypeColor={
              PLAYER_TYPE_COLORS[finalTypeId]
            }
            startAttributes={startAttributes}
            finalAttributes={finalAttributes}
          />

          <section className={styles.chartColumn}>
            <TypesChart
              player={startPosition}
              path={trainingPath}
              language={language}
              playerName={playerName}
              playerImageUrl={playerImageUrl}
            />
          </section>

          <TrainingSelectFilter
            language={language}
            trainings={trainings}
            onSelectionChange={handleSelectionChange}
            startPots={startPots}
          />
        </div>
      </Suspense>
    </main>
  );
}
