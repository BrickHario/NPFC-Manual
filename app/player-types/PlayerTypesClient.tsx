
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
import type {
  PlayerTypeSelection,
} from "./player-selection";
import {
  getSavedPlayerIds,
  removeSavedPlayerId,
  savePlayerIds,
} from "./player-selection";
import {
  readImportedPlayers,
  saveImportedPlayers,
  removeImportedPlayer,
  type ImportedSavePlayer,
} from "./save-parser";
import ImportSaveButton from "./ImportSaveButton";
import TypesChart from "./TypesChart";
import { playerTypeRows } from "./player-type-data";
import {
  PLAYER_TYPE_COLORS,
  PLAYER_TYPE_NAMES,
  calculateAttributes,
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
const TRAINING_STORAGE_KEY = "npfc-player-training-orders-v1";
const POSITION_STORAGE_KEY = "npfc-player-type-positions-v1";
const SELECTED_PLAYER_STORAGE_KEY = "npfc-selected-player-v1";

type Position = { x: number; y: number };
type TrainingOrders = Record<string, SelectedTraining[]>;
type PlayerEntry = PlayerTypeSelection | ImportedSavePlayer;

type PlayerTypesClientProps = {
  trainings: TrainingEntry[];
  initialLanguage: Language;
  initialPlayers: PlayerTypeSelection[];
};

function isImportedPlayer(
  player: PlayerEntry
): player is ImportedSavePlayer {
  return "source" in player && player.source === "save";
}

function mergePlayers(
  marketplace: PlayerTypeSelection[],
  imported: ImportedSavePlayer[]
): PlayerEntry[] {
  const map = new Map<number, PlayerEntry>();

  for (const player of marketplace) {
    map.set(player.id, player);
  }

  for (const player of imported) {
    map.set(player.id, player);
  }

  return [...map.values()];
}

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

function readTrainingOrders(): TrainingOrders {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(TRAINING_STORAGE_KEY) ?? "{}"
    );

    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return {};
    }

    const result: TrainingOrders = {};

    for (const [key, entries] of Object.entries(value)) {
      if (!Array.isArray(entries)) continue;

      result[key] = entries.flatMap((entry, index) => {
        if (!entry || typeof entry !== "object") {
          return [];
        }

        const item = entry as Record<string, unknown>;

        if (
          (item.kind !== "card" && item.kind !== "combo") ||
          typeof item.id !== "number" ||
          !Number.isSafeInteger(item.id) ||
          item.id < 0
        ) {
          return [];
        }

        return [{
          kind: item.kind,
          id: item.id,
          instanceId:
            typeof item.instanceId === "number" &&
            Number.isSafeInteger(item.instanceId)
              ? item.instanceId
              : index,
        }];
      });
    }

    return result;
  } catch {
    return {};
  }
}

function readPositions(): Record<string, Position> {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(POSITION_STORAGE_KEY) ?? "{}"
    );

    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return {};
    }

    const result: Record<string, Position> = {};

    for (const [key, position] of Object.entries(value)) {
      if (!position || typeof position !== "object") {
        continue;
      }

      const point = position as Record<string, unknown>;

      if (
        typeof point.x !== "number" ||
        typeof point.y !== "number" ||
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y)
      ) {
        continue;
      }

      result[key] = {
        x: clampCoordinate(point.x),
        y: clampCoordinate(point.y),
      };
    }

    return result;
  } catch {
    return {};
  }
}

export default function PlayerTypesClient({
  trainings,
  initialLanguage,
  initialPlayers,
}: PlayerTypesClientProps) {
  const router = useRouter();

  const [players, setPlayers] = useState<PlayerEntry[]>(
    initialPlayers
  );

  const [positions, setPositions] = useState<
    Record<string, Position>
  >({});

  const [selectedPlayerKey, setSelectedPlayerKey] =
    useState<string | null>(null);

  const [trainingOrders, setTrainingOrders] =
    useState<TrainingOrders>({});

  const [storageLoaded, setStorageLoaded] =
    useState(false);

  const language = initialLanguage;

  useEffect(() => {
    setPlayers(
      mergePlayers(
        initialPlayers,
        readImportedPlayers()
      )
    );
  }, [initialPlayers]);

  useEffect(() => {
    setTrainingOrders(readTrainingOrders());
    setPositions(readPositions());

    const savedSelection = localStorage.getItem(
      SELECTED_PLAYER_STORAGE_KEY
    );

    setSelectedPlayerKey(savedSelection || null);
    setStorageLoaded(true);
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;

    localStorage.setItem(
      TRAINING_STORAGE_KEY,
      JSON.stringify(trainingOrders)
    );
  }, [trainingOrders, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;

    localStorage.setItem(
      POSITION_STORAGE_KEY,
      JSON.stringify(positions)
    );
  }, [positions, storageLoaded]);

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

  useEffect(() => {
    if (!storageLoaded) return;

    if (players.length === 0) {
      setSelectedPlayerKey("dummy");
      return;
    }

    const available = players.map(
      (player) => String(player.id)
    );

    setSelectedPlayerKey((current) => {
      if (available.length === 1) {
        return available[0];
      }

      return current !== null &&
        available.includes(current)
        ? current
        : null;
    });
  }, [players, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;

    if (selectedPlayerKey === null) {
      localStorage.removeItem(
        SELECTED_PLAYER_STORAGE_KEY
      );
    } else {
      localStorage.setItem(
        SELECTED_PLAYER_STORAGE_KEY,
        selectedPlayerKey
      );
    }
  }, [selectedPlayerKey, storageLoaded]);

  const handleImport = useCallback(
    (imported: ImportedSavePlayer[]) => {
      const saved = readImportedPlayers();

      const map = new Map<number, ImportedSavePlayer>();

      for (const player of saved) {
        map.set(player.id, player);
      }

      for (const player of imported) {
        map.set(player.id, player);
      }

      const updatedImported = [...map.values()];

      saveImportedPlayers(updatedImported);

      savePlayerIds([
        ...getSavedPlayerIds(),
        ...imported.map((player) => player.id),
      ]);

      setPlayers((current) => {
        const updated = new Map<number, PlayerEntry>();

        for (const player of current) {
          updated.set(player.id, player);
        }

        for (const player of imported) {
          updated.set(player.id, player);
        }

        return [...updated.values()];
      });
    },
    []
  );

  const handleRemovePlayer = useCallback(
    (id: number) => {
      removeSavedPlayerId(id);
      removeImportedPlayer(id);

      setPlayers((current) =>
        current.filter((player) => player.id !== id)
      );

      setSelectedPlayerKey((current) =>
        current === String(id) ? null : current
      );

      if (
        window.location.search.includes("playerId=")
      ) {
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
      const key = id === null ? "dummy" : String(id);

      const player = players.find(
        (entry) => String(entry.id) === key
      );

      if (player && isImportedPlayer(player)) {
        return;
      }

      setPositions((current) => {
        const updated = {
          ...current,
          [key]: {
            x: current[key]?.x ?? 50,
            y: current[key]?.y ?? 50,
            [axis]: clampCoordinate(value),
          },
        };

        if (storageLoaded) {
          localStorage.setItem(
            POSITION_STORAGE_KEY,
            JSON.stringify(updated)
          );
        }

        return updated;
      });
    },
    [players, storageLoaded]
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

  const displayPlayers = useMemo(
    () =>
      players.length > 0
        ? players
        : [{
            id: 0,
            name: "Dummy",
            imageUrl: "/Dummy.png",
            skills: Array<number>(10).fill(0),
          }],
    [players]
  );

  const activePlayerKey =
    players.length === 0
      ? "dummy"
      : players.length === 1
        ? String(players[0].id)
        : selectedPlayerKey;

  const selectedTrainings =
    activePlayerKey === null
      ? []
      : trainingOrders[activePlayerKey] ?? [];

  const handleSelectionChange = useCallback(
    (items: SelectedTraining[]) => {
      if (
        activePlayerKey === null ||
        !storageLoaded
      ) {
        return;
      }

      setTrainingOrders((current) => {
        const updated = {
          ...current,
          [activePlayerKey]: items,
        };

        localStorage.setItem(
          TRAINING_STORAGE_KEY,
          JSON.stringify(updated)
        );

        return updated;
      });
    },
    [activePlayerKey, storageLoaded]
  );

  const playerViews = useMemo<PlayerDisplay[]>(() => {
    return displayPlayers.map((player) => {
      const id = player.id === 0 ? null : player.id;
      const key = id === null ? "dummy" : String(id);

      const imported = isImportedPlayer(player);

      const initialSkillPoints = imported
        ? [...player.skillPoints]
        : Array.from({ length: 10 }, (_, index) => {
            const level = Number(
              player.skills[index] ?? 0
            );

            return SKILL_VALUES[level] ?? 0;
          });

      const startPots = imported
        ? [...player.typeWeights]
        : estimatePotsForPosition(
            positions[key]?.x ?? 50,
            positions[key]?.y ?? 50
          );

      const startPosition =
        calculatePlayerPosition(startPots);

      const x = imported
        ? startPosition.x
        : positions[key]?.x ?? 50;

      const y = imported
        ? startPosition.y
        : positions[key]?.y ?? 50;

      const trainingsForPlayer =
        trainingOrders[key] ?? [];

      const skillTotals = Array<number>(10).fill(0);

      for (const item of trainingsForPlayer) {
        const entry = trainingCatalog.get(
          `${item.kind}:${item.id}`
        );

        if (!entry) continue;

        for (let i = 0; i < 10; i++) {
          skillTotals[i] += Number(
            entry.skillChanges[i] ?? 0
          );
        }
      }

      const finalSkillPoints =
        initialSkillPoints.map(
          (original, index) =>
            Math.max(
              0,
              original + skillTotals[index]
            )
        );

      const startAttributes =
        calculateAttributes(
          toSkillRow(initialSkillPoints),
          "points"
        );

      const finalAttributes =
        calculateAttributes(
          toSkillRow(finalSkillPoints),
          "points"
        );

      let currentPots = [...startPots];
      const path: Position[] = [];

      for (const item of trainingsForPlayer) {
        const entry = trainingCatalog.get(
          `${item.kind}:${item.id}`
        );

        if (!entry) continue;

        const step = calculateTrainingStep(
          currentPots,
          entry.potChanges
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
        isImported: imported,
        potentialPercent:
  imported &&
  player.potentialCurve?.length === 33
    ? player.potentialCurve[
        Math.min(
          32,
          Math.floor(player.developmentWeeks / 12)
        )
      ]
    : undefined,
        developmentWeeks: imported
          ? player.developmentWeeks
          : undefined,
        x,
        y,
        typeColor:
          PLAYER_TYPE_COLORS[
            getPlayerTypeId(x, y)
          ],
        finalX: finalPosition.x,
        finalY: finalPosition.y,
        finalType:
          PLAYER_TYPE_NAMES[
            language
          ][finalTypeId],
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
    trainingOrders,
    trainingCatalog,
    language,
  ]);

  const selectedPlayer = playerViews.find(
    (player) =>
      (
        player.id === null
          ? "dummy"
          : String(player.id)
      ) === activePlayerKey
  );

  const getPlayerType = useCallback(
    (x: number, y: number) =>
      PLAYER_TYPE_NAMES[language][
        getPlayerTypeId(x, y)
      ],
    [language]
  );

  return (
    <main
      className={styles.pageContent}
      style={{ position: "relative" }}
    >
      <Suspense>
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 10,
          }}
        >
          <ImportSaveButton
            onImport={handleImport}
          />
        </div>

        <div className={styles.languageDock}>
          <LanguageSwitcher />
        </div>

        <div className={styles.layout}>
          <h1 className={styles.heading}>
            Player Types
          </h1>

          <TypePlayers
            players={playerViews}
            selectedPlayerKey={activePlayerKey}
            onSelectPlayer={(key) => {
              if (players.length <= 1) return;

              setSelectedPlayerKey((current) =>
                current === key ? null : key
              );
            }}
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
              selectedPlayerKey={activePlayerKey}
              language={language}
            />
          </section>

          <TrainingSelectFilter
            language={language}
            trainings={trainings}
            selected={selectedTrainings}
            selectedPlayerName={
              selectedPlayer?.name ?? null
            }
            hasSelectedPlayer={
              selectedPlayer !== undefined
            }
            onSelectionChange={
              handleSelectionChange
            }
            startPots={
              selectedPlayer?.startPots ??
              Array<number>(12).fill(50)
            }
          />
        </div>
      </Suspense>
    </main>
  );
}
