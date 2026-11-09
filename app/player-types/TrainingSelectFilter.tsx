
"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DragEvent } from "react";
import type { Language } from "../../lib/utils";
import styles from "./TrainingSelectFilter.module.css";
import { calculateTrainingStep } from "./player-type-calculation";

type TrainingSelectFilterProps = {
  language: Language;
  trainings: TrainingEntry[];
  onSelectionChange: (selected: SelectedTraining[]) => void;
  startPots: number[];
};

export type TrainingKind = "card" | "combo";

export type TrainingNames = {
  en: string;
  de: string;
  es: string;
  it: string;
  fr: string;
};

export type SelectedTraining = {
  kind: TrainingKind;
  id: number;
  instanceId: number;
};

export type TrainingEntry = {
  kind: TrainingKind;
  id: number;
  hasMatchActions: boolean;
  names: TrainingNames;
  imageUrl: string;
  potChanges: number[];
  skillChanges: number[];
};


const labels = {
  heading: "Training",
  search: "Search for training..",
  cards: "Cards",
  combos: "Combos",
  selected: "Dummy",
  empty: "No training selected",
  noResults: "No matches",
  remove: "Remove training",
  reset: "Reset filters",
  match: {
    all: "Match actions",
    only: "Yes",
    excluded: "No",
  },
} as const;

const directions = [
  { value: "right", label: "Right", dx: 1, dy: 0 },
  { value: "up-right", label: "Up Right", dx: 1, dy: 1 },
  { value: "up", label: "Up", dx: 0, dy: 1 },
  { value: "up-left", label: "Up Left", dx: -1, dy: 1 },
  { value: "left", label: "Left", dx: -1, dy: 0 },
  { value: "down-left", label: "Down Left", dx: -1, dy: -1 },
  { value: "down", label: "Down", dx: 0, dy: -1 },
  { value: "down-right", label: "Down Right", dx: 1, dy: -1 },
] as const;

const sortOptions = [
  { value: "all", label: "Sort by Direction" },
  { value: "zero", label: "No movement" },
  ...directions,
] as const;

type Direction = "all" | "zero" | (typeof directions)[number]["value"];
type MatchFilter = keyof typeof labels.match;

function getTrainingVector(pots: number[], potChanges: number[]) {
  const step = calculateTrainingStep(pots, potChanges);
  const { dx, dy } = step;

  if (dx === 0 && dy === 0) {
    return { ...step, direction: "zero" as Direction };
  }

  const sector =
    (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;

  return {
    ...step,
    direction: directions[sector].value as Direction,
  };
}

function getVectorLabel(dx: number, dy: number) {

  const signed = (value: number) =>
    value > 0 ? `+${value}` : String(value);

  return `X ${signed(dx)} / Y ${signed(dy)}`;
}

function entryKey(entry: {
  kind: TrainingKind;
  id: number;
}) {
  return `${entry.kind}:${entry.id}`;
}

export default function TrainingSelectFilter({
  language,
  trainings,
  onSelectionChange,
  startPots,
}: TrainingSelectFilterProps) {
  const [search, setSearch] = useState("");
  const [showCards, setShowCards] = useState(true);
  const [showCombos, setShowCombos] = useState(true);
  const [direction, setDirection] = useState<Direction>("all");
  const [selected, setSelected] = useState<SelectedTraining[]>([]);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");

  const sortRef = useRef<HTMLDetailsElement>(null);
  const matchRef = useRef<HTMLDetailsElement>(null);
  const draggedId = useRef<number | null>(null);
  const nextInstanceId = useRef(0);
  useEffect(() => {
  const dropdowns = [sortRef, matchRef];

  const handlePointerDown = (event: PointerEvent) => {
    const target = event.target as Node;

    dropdowns.forEach((ref) => {
      if (ref.current && !ref.current.contains(target)) {
        ref.current.open = false;
      }
    });
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      dropdowns.forEach((ref) => {
        if (ref.current) {
          ref.current.open = false;
        }
      });
    }
  };

  document.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("keydown", handleKeyDown);

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown);
    document.removeEventListener("keydown", handleKeyDown);
  };
}, []);

  useEffect(() => {
    onSelectionChange(selected);
  }, [selected, onSelectionChange]);

  const catalog = useMemo(
    () =>
      new Map(
        trainings.map((entry) => [
          entryKey(entry),
          entry,
        ])
      ),
    [trainings]
  );

  const { selectedVectors, previewPots } = useMemo(() => {
    const vectors = new Map<
      number,
      ReturnType<typeof getTrainingVector>
    >();

    let currentPots = [...startPots];

    for (const item of selected) {
      const entry = catalog.get(entryKey(item));
      if (!entry) continue;

      const vector = getTrainingVector(
        currentPots,
        entry.potChanges
      );

      vectors.set(item.instanceId, vector);
      currentPots = vector.nextPots;
    }

    return {
      selectedVectors: vectors,
      previewPots: currentPots,
    };
  }, [selected, catalog, startPots]);

  const trainingVectors = useMemo(
    () =>
      new Map(
        trainings.map((entry) => [
          entryKey(entry),
          getTrainingVector(previewPots, entry.potChanges),
        ])
      ),
    [trainings, previewPots]
  );

  const options = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const selectedDirection = directions.find(
      (option) => option.value === direction
    );

    const projection = (entry: TrainingEntry) => {
      const vector = trainingVectors.get(entryKey(entry));
      if (!vector || !selectedDirection) return 0;

      return (
        vector.dx * selectedDirection.dx +
        vector.dy * selectedDirection.dy
      ) / Math.hypot(selectedDirection.dx, selectedDirection.dy);
    };

    return trainings
      .filter((entry) => {
        if (entry.kind === "card" && !showCards) return false;
        if (entry.kind === "combo" && !showCombos) return false;

        if (matchFilter === "only" && !entry.hasMatchActions) return false;
        if (matchFilter === "excluded" && entry.hasMatchActions) return false;

        if (direction !== "all") {
          const vector = trainingVectors.get(entryKey(entry));
          if (vector?.direction !== direction) return false;
        }

        if (!query) return true;

        return Object.values(entry.names).some((name) =>
          name.toLocaleLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (selectedDirection) {
          const difference = projection(b) - projection(a);
          if (difference !== 0) return difference;
        }

        return a.names[language].localeCompare(b.names[language]);
      });
  }, [
    trainings,
    trainingVectors,
    language,
    search,
    showCards,
    showCombos,
    matchFilter,
    direction,
  ]);

  function addTraining(entry: TrainingEntry) {
    const instanceId = nextInstanceId.current++;

    setSelected((current) => [
      ...current,
      {
        kind: entry.kind,
        id: entry.id,
        instanceId,
      },
    ]);
  }

  function removeTraining(instanceId: number) {
    setSelected((current) =>
      current.filter(
        (item) => item.instanceId !== instanceId
      )
    );
  }

  function clearTrainings() {
  setSelected([]);
}

  function moveTraining(fromId: number, toId: number) {
    setSelected((current) => {
      const fromIndex = current.findIndex(
        (item) => item.instanceId === fromId
      );

      const toIndex = current.findIndex(
        (item) => item.instanceId === toId
      );

      if (
        fromIndex === -1 ||
        toIndex === -1 ||
        fromIndex === toIndex
      ) {
        return current;
      }

      const updated = [...current];
      const [moved] = updated.splice(fromIndex, 1);

      updated.splice(toIndex, 0, moved);

      return updated;
    });
  }

  function handleDragStart(
    event: DragEvent<HTMLDivElement>,
    instanceId: number
  ) {
    draggedId.current = instanceId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      String(instanceId)
    );
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>,
    instanceId: number
  ) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    setDragOverId(
      draggedId.current !== instanceId
        ? instanceId
        : null
    );
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
    instanceId: number
  ) {
    event.preventDefault();

    if (draggedId.current !== null) {
      moveTraining(draggedId.current, instanceId);
    }

    draggedId.current = null;
    setDragOverId(null);
  }

  function handleDragEnd() {
    draggedId.current = null;
    setDragOverId(null);
  }

  function resetFilters() {
    setSearch("");
    setShowCards(true);
    setShowCombos(true);
    setDirection("all");
    setMatchFilter("all");

    if (sortRef.current) {
      sortRef.current.open = false;
    }
    if (matchRef.current) {
      matchRef.current.open = false;
    }
  }

  return (
    <aside className={styles.trainingPanel}>
      <h2 className={styles.title}>
        {labels.heading}
      </h2>

      <div className={styles.filterBlock}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <input
              className={`${styles.control} ${styles.searchInput}`}
              type="search"
              placeholder={labels.search}
              aria-label={labels.search}
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            <label className={styles.optionLabel}>
              <input
                className={styles.checkbox}
                type="checkbox"
                checked={showCards}
                onChange={(event) =>
                  setShowCards(event.target.checked)
                }
              />
              <span>{labels.cards}</span>
            </label>

            <label className={styles.optionLabel}>
              <input
                className={styles.checkbox}
                type="checkbox"
                checked={showCombos}
                onChange={(event) =>
                  setShowCombos(event.target.checked)
                }
              />
              <span>{labels.combos}</span>
            </label>

            <details
              ref={matchRef}
              className={`${styles.singleFilter} ${styles.sortFilter}`}
            >
              <summary
                className={`${styles.control} ${styles.filterSummary}`}
              >
                <span className={styles.filterText}>
                  {labels.match[matchFilter]}
                </span>
              </summary>

              <div className={styles.filterMenu}>
                {(Object.keys(labels.match) as MatchFilter[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.optionButton} ${
                      matchFilter === option ? styles.optionSelected : ""
                    }`}
                    onClick={() => {
                      setMatchFilter(option);

                      if (matchRef.current) {
                        matchRef.current.open = false;
                      }
                    }}
                  >
                    {labels.match[option]}
                  </button>
                ))}
              </div>
            </details>

            <details
              ref={sortRef}
              className={`${styles.singleFilter} ${styles.sortFilter}`}
            >
              <summary
                className={`${styles.control} ${styles.filterSummary}`}
              >
                <span className={styles.filterText}>
                  {
                    sortOptions.find(
                      (option) =>
                        option.value === direction
                    )?.label
                  }
                </span>
              </summary>

              <div className={styles.filterMenu}>
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.optionButton} ${
                      direction === option.value
                        ? styles.optionSelected
                        : ""
                    }`}
                    onClick={() => {
                      setDirection(option.value);

                      if (sortRef.current) {
                        sortRef.current.open = false;
                      }
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </details>

            <button
              type="button"
              className={styles.resetLink}
              onClick={resetFilters}
            >
              {labels.reset}
            </button>
          </div>
        </div>

        <div className={styles.availableShell}>
          <div className={styles.availableList}>
            {options.length === 0 && (
              <p className={styles.empty}>
                {labels.noResults}
              </p>
            )}

            {options.map((entry) => (
              <button
                type="button"
                className={styles.availableItem}
                key={entryKey(entry)}
                onClick={() => addTraining(entry)}
                aria-label={entry.names[language]}
                title={entry.names[language]}
              >
                <span className={styles.availableImage}>
                  <Image
                    src={entry.imageUrl}
                    alt=""
                    width={150}
                    height={98}
                    unoptimized
                  />
                  <span className={styles.availableName}>
                    {entry.names[language]}
                  </span>       
                  <span className={styles.availableVector}>
                    {(() => {
                      const vector = trainingVectors.get(entryKey(entry));
                      return vector
                        ? getVectorLabel(vector.dx, vector.dy)
                        : "0 X 0 / Y 0";
                    })()}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

     
<div className={styles.selectedHeader}>
  <h3 className={styles.playerTitle}>
    Order for {labels.selected}:
  </h3>

  {selected.length > 0 && (
    <button
      type="button"
      className={styles.deleteAllButton}
      onClick={clearTrainings}
    >
      Delete All
    </button>
  )}
</div>


      <div className={styles.selectedList}>
        {selected.length === 0 && (
          <p className={styles.empty}>
            {labels.empty}
          </p>
        )}

        {selected
  .map((item, index) => ({ item, index }))
  .reverse()
  .map(({ item, index }) => {
          const entry = catalog.get(entryKey(item));

          if (!entry) return null;

          return (
            <div
              className={`${styles.selectedItem} ${
                dragOverId === item.instanceId
                  ? styles.dragOver
                  : ""
              }`}
              key={item.instanceId}
              draggable
              onDragStart={(event) =>
                handleDragStart(
                  event,
                  item.instanceId
                )
              }
              onDragOver={(event) =>
                handleDragOver(
                  event,
                  item.instanceId
                )
              }
              onDrop={(event) =>
                handleDrop(
                  event,
                  item.instanceId
                )
              }
              onDragEnd={handleDragEnd}
            >
              <span className={styles.itemNumber}>
                {index + 1}.
              </span>

              <div className={styles.trainingCard}>
                <span className={styles.availableImage}>
                  <Image
                    src={entry.imageUrl}
                    alt=""
                    width={150}
                    height={98}
                    unoptimized
                    draggable={false}
                  />
                  <span className={styles.availableName}>
                    {entry.names[language]}
                  </span>               
                  <span className={styles.availableVector}>
                    {(() => {
                      const vector = selectedVectors.get(item.instanceId);
                      return vector
                        ? getVectorLabel(vector.dx, vector.dy)
                        : "X 0 / Y 0";
                    })()}
                  </span>
                </span>
              </div>

              <button
                className={styles.removeButton}
                type="button"
                draggable={false}
                aria-label={`${labels.remove}: ${entry.names[language]}`}
                onClick={() =>
                  removeTraining(item.instanceId)
                }
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
