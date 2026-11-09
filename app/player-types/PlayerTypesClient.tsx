
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type {
  SelectedTraining,
  TrainingEntry,
} from "./training-types";
import type { PlayerTypeSelection } from "./player-selection";
import {
  getSavedPlayerIds,
  removeSavedPlayerId,
  savePlayerIds,
} from "./player-selection";
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
import {
  TypePlayers,
  type PlayerDisplay,
} from "./TypePlayers";
import LanguageSwitcher from "../LanguageSwitcher";
import TrainingSelectFilter from "./TrainingSelectFilter";

const SKILL_VALUES = [0, 50, 150, 350, 600, 1000] as const;

type Position = {
  x: number;
  y: number;
};

type PlayerTypesClientProps = {
  trainings: TrainingEntry[];
  initialLanguage: Language;
  initialPlayers: PlayerTypeSelection[];
};

function clampCoordinate(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getPlayerTypeId(x: number, y: number): number {
  const row = playerTypeRows[clampCoordinate(y)];

  if (!row) return 0;

  for (let i = 0; i < row.length; i += 2) {
    if (x <= row[i]) return row[i + 1];
  }

  return 0;
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

    return positionError * 10000 + potentialDifference / 12;
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
    row[`skill_${String(i + 1).padStart(2, "0")}`] =
      Number(values[i] ?? 0);
  }

  return row;
}

export default function PlayerTypesClient({
  trainings,
  initialLanguage,
  initialPlayers,
}: PlayerTypesClientProps) {
  const router = useRouter();

  const [players, setPlayers] =
    useState<PlayerTypeSelection[]>(initialPlayers);

  const [positions, setPositions] =
    useState<Record<number, Position>>({});

  const [language] = useState<Language>(initialLanguage);

  const [selectedTrainings, setSelectedTrainings] =
    useState<SelectedTraining[]>([]);

  useEffect(() => {
    setPlayers(initialPlayers);
  }, [initialPlayers]);

  useEffect(() => {
    const savedIds = getSavedPlayerIds();

    const currentIds = initialPlayers.map(
      (player) => player.id
    );

    const combined = [
      ...new Set([...savedIds, ...currentIds]),
    ];

    if (combined.length !== savedIds.length) {
      savePlayerIds(combined);
    }

    const legacyId = Number(
      localStorage.getItem("npfc-player-type-id")
    );

    if (
      savedIds.length === 0 &&
      initialPlayers.length === 0 &&
      Number.isSafeInteger(legacyId) &&
      legacyId > 0
    ) {
      savePlayerIds([legacyId]);
      router.refresh();
    }

    localStorage.removeItem("npfc-player-type-id");
  }, [initialPlayers, router]);

  const handleRemovePlayer = useCallback(
    (id: number) => {
      removeSavedPlayerId(id);

      setPlayers((current) =>
        current.filter((player) => player.id !== id)
      );

      if (window.location.search.includes("playerId=")) {
        router.replace("/player-types");
      } else {
        router.refresh();
      }
    },
    [router]
  );

  const handlePositionChange = useCallback(
    (
      id: number | null,
      axis: "x" | "y",
      value: number
    ) => {
      const key = id ?? 0;

      setPositions((current) => ({
        ...current,
        [key]: {
          x: current[key]?.x ?? 50,
          y: current[key]?.y ?? 50,
          [axis]: clampCoordinate(value),
        },
      }));
    },
    []
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
  }, [selectedTrainings, trainingCatalog]);

  const displayPlayers = useMemo(
    () =>
      players.length > 0
        ? players
        : [
            {
              id: 0,
              name: "Dummy",
              imageUrl: "/Dummy.png",
              skills: Array<number>(10).fill(0),
            },
          ],
    [players]
  );

  const playerViews = useMemo<PlayerDisplay[]>(() => {
    return displayPlayers.map((player) => {
      const id = player.id === 0 ? null : player.id;
      const key = id ?? 0;

      const { x, y } = positions[key] ?? {
        x: 50,
        y: 50,
      };

      const initialSkillPoints = Array.from(
        { length: 10 },
        (_, index) => {
          const level = Number(
            player.skills[index] ?? 0
          );

          return SKILL_VALUES[level] ?? 0;
        }
      );

      const finalSkillPoints =
        initialSkillPoints.map(
          (original, index) =>
            Math.max(0, original + skillTotals[index])
        );

      const startAttributes = calculateAttributes(
        toSkillRow(initialSkillPoints),
        "points"
      );

      const finalAttributes = calculateAttributes(
        toSkillRow(finalSkillPoints),
        "points"
      );

      const startPots =
        estimatePotsForPosition(x, y);

      const startPosition =
        calculatePlayerPosition(startPots);

      let currentPots = [...startPots];

      const path: Position[] = [];

      for (const selected of selectedTrainings) {
        const training = trainingCatalog.get(
          `${selected.kind}:${selected.id}`
        );

        if (!training) continue;

        const step = calculateTrainingStep(
          currentPots,
          training.potChanges
        );

        currentPots = step.nextPots;
        path.push(step.position);
      }

      const finalPosition =
        path.length > 0
          ? path[path.length - 1]
          : startPosition;

      const finalTypeId = getPlayerTypeId(
        finalPosition.x,
        finalPosition.y
      );

      return {
        id,
        name: player.name,
        imageUrl: player.imageUrl,
        x,
        y,
        typeColor:
          PLAYER_TYPE_COLORS[getPlayerTypeId(x, y)],
        finalX: finalPosition.x,
        finalY: finalPosition.y,
        finalType:
          PLAYER_TYPE_NAMES[language][finalTypeId],
        finalTypeColor:
          PLAYER_TYPE_COLORS[finalTypeId],
        startAttributes,
        finalAttributes,
        startPots,
        startPosition,
        path,
      };
    });
  }, [
    displayPlayers,
    positions,
    selectedTrainings,
    trainingCatalog,
    skillTotals,
    language,
  ]);

  const getPlayerType = useCallback(
    (x: number, y: number) =>
      PLAYER_TYPE_NAMES[language][
        getPlayerTypeId(x, y)
      ],
    [language]
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
            players={playerViews}
            onRemovePlayer={handleRemovePlayer}
            onPositionChange={handlePositionChange}
            clampCoordinate={clampCoordinate}
            getPlayerType={getPlayerType}
          />

          <section className={styles.chartColumn}>
            <TypesChart
              players={playerViews.map((player) => ({
                id: player.id,
                name: player.name,
                imageUrl: player.imageUrl,
                startPosition: player.startPosition,
                path: player.path,
              }))}
              language={language}
            />
          </section>

          <TrainingSelectFilter
            language={language}
            trainings={trainings}
            onSelectionChange={handleSelectionChange}
            startPots={playerViews[0].startPots}
          />
        </div>
      </Suspense>
    </main>
  );
}
