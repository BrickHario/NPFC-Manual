
"use client";

import Image from "next/image";
import Link from "next/link";
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
import type {
  SelectedTraining,
  TrainingEntry,
  TrainingKind,
} from "./training-types";

type TrainingSelectFilterProps = {
  language: Language;
  trainings: TrainingEntry[];
  onSelectionChange: (selected: SelectedTraining[]) => void;
  startPots: number[];
  selected: SelectedTraining[];
  selectedPlayerName: string | null;
  hasSelectedPlayer: boolean;
};

export type TrainingNames = {
  en: string;
  de: string;
  es: string;
  it: string;
  fr: string;
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
    all: "All: Match actions",
    only: "Yes: Match actions",
    excluded: "No: Match actions",
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

type Direction =
  | "all"
  | "zero"
  | (typeof directions)[number]["value"];

type MatchFilter = keyof typeof labels.match;

const FILTER_STORAGE_KEY = "npfc-training-filters-v1";

type SavedFilters = {
  search: string;
  showCards: boolean;
  showCombos: boolean;
  direction: Direction;
  matchFilter: MatchFilter;
};

function readSavedFilters(): SavedFilters | null {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);

    if (!raw) return null;

    const value: unknown = JSON.parse(raw);

    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return null;
    }

    const filters = value as Record<string, unknown>;
    const validDirections = sortOptions.map(
      (option) => option.value
    );

    const validMatchFilters = Object.keys(labels.match);

    return {
      search:
        typeof filters.search === "string"
          ? filters.search
          : "",
      showCards:
        typeof filters.showCards === "boolean"
          ? filters.showCards
          : true,
      showCombos:
        typeof filters.showCombos === "boolean"
          ? filters.showCombos
          : true,
      direction:
        typeof filters.direction === "string" &&
        validDirections.includes(
          filters.direction as Direction
        )
          ? (filters.direction as Direction)
          : "all",
      matchFilter:
        typeof filters.matchFilter === "string" &&
        validMatchFilters.includes(filters.matchFilter)
          ? (filters.matchFilter as MatchFilter)
          : "all",
    };
  } catch {
    return null;
  }
}

function getTrainingVector(
  pots: number[],
  potChanges: number[]
) {
  const step = calculateTrainingStep(pots, potChanges);
  const { dx, dy } = step;

  if (dx === 0 && dy === 0) {
    return {
      ...step,
      direction: "zero" as Direction,
    };
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
  selected,
  selectedPlayerName,
  hasSelectedPlayer,
}: TrainingSelectFilterProps) {
  const [search, setSearch] = useState("");
  const [showCards, setShowCards] = useState(true);
  const [showCombos, setShowCombos] = useState(true);
  const [direction, setDirection] = useState<Direction>("all");
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [matchFilter, setMatchFilter] =
    useState<MatchFilter>("all");
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  const sortRef = useRef<HTMLDetailsElement>(null);
  const matchRef = useRef<HTMLDetailsElement>(null);
  const draggedId = useRef<number | null>(null);
  const nextInstanceId = useRef(0);

  useEffect(() => {
    const saved = readSavedFilters();

    if (saved) {
      setSearch(saved.search);
      setShowCards(saved.showCards);
      setShowCombos(saved.showCombos);
      setDirection(saved.direction);
      setMatchFilter(saved.matchFilter);
    }

    setFiltersLoaded(true);
  }, []);

  useEffect(() => {
    if (!filtersLoaded) return;

    const filters: SavedFilters = {
      search,
      showCards,
      showCombos,
      direction,
      matchFilter,
    };

    localStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify(filters)
    );
  }, [
    filtersLoaded,
    search,
    showCards,
    showCombos,
    direction,
    matchFilter,
  ]);

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
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

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
          getTrainingVector(
            previewPots,
            entry.potChanges
          ),
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
      ) / Math.hypot(
        selectedDirection.dx,
        selectedDirection.dy
      );
    };

    return trainings
      .filter((entry) => {
        if (entry.kind === "card" && !showCards) {
          return false;
        }

        if (entry.kind === "combo" && !showCombos) {
          return false;
        }

        if (
          matchFilter === "only" &&
          !entry.hasMatchActions
        ) {
          return false;
        }

        if (
          matchFilter === "excluded" &&
          entry.hasMatchActions
        ) {
          return false;
        }

        if (direction !== "all") {
          const vector = trainingVectors.get(
            entryKey(entry)
          );

          if (vector?.direction !== direction) {
            return false;
          }
        }

        if (!query) return true;

        return Object.values(entry.names).some(
          (name) =>
            name.toLocaleLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (selectedDirection) {
          const difference =
            projection(b) - projection(a);

          if (difference !== 0) {
            return difference;
          }
        }

        return a.names[language].localeCompare(
          b.names[language]
        );
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
    if (!hasSelectedPlayer) return;

    const instanceId = Math.max(
      nextInstanceId.current,
      ...selected.map((item) => item.instanceId + 1),
      0
    );

    nextInstanceId.current = instanceId + 1;

    onSelectionChange([
      ...selected,
      {
        kind: entry.kind,
        id: entry.id,
        instanceId,
      },
    ]);
  }

  function removeTraining(instanceId: number) {
    onSelectionChange(
      selected.filter(
        (item) => item.instanceId !== instanceId
      )
    );
  }

  function clearTrainings() {
    onSelectionChange([]);
  }

  function moveTraining(
    fromId: number,
    toId: number
  ) {
    const current = selected;

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
      return;
    }

    const updated = [...current];
    const [moved] = updated.splice(fromIndex, 1);

    updated.splice(toIndex, 0, moved);
    onSelectionChange(updated);
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
      moveTraining(
        draggedId.current,
        instanceId
      );
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
                {(Object.keys(labels.match) as MatchFilter[]).map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      className={`${styles.optionButton} ${
                        matchFilter === option
                          ? styles.optionSelected
                          : ""
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
                  )
                )}
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
          {!hasSelectedPlayer ? (
            <p className={styles.selectionHint}>
              Select a player first
            </p>
          ) : (
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
                        const vector = trainingVectors.get(
                          entryKey(entry)
                        );

                        return vector
                          ? getVectorLabel(
                              vector.dx,
                              vector.dy
                            )
                          : "X 0 / Y 0";
                      })()}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.selectedHeader}>
        <h3 className={styles.playerTitle}>
          Order for {selectedPlayerName || "Dummy"}:
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
        {!hasSelectedPlayer ? (
          <p className={styles.empty}>
            Select a player first
          </p>
        ) : selected.length === 0 ? (
          <p className={styles.empty}>
            {labels.empty}
          </p>
        ) : null}

        {selected
          .map((item, index) => ({
            item,
            index,
          }))
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
                        const vector = selectedVectors.get(
                          item.instanceId
                        );

                        return vector
                          ? getVectorLabel(
                              vector.dx,
                              vector.dy
                            )
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

                <Link
                  href={`/cards-and-combos?id=${entry.id}`}
                  className={`${styles.removeButton} ${styles.trainingInfoButton}`}
                  aria-label={`View ${entry.names[language]} information`}
                  title="Training info"
                  draggable={false}
                  onDragStart={(event) =>
                    event.preventDefault()
                  }
                >
                  i
                </Link>
              </div>
            );
          })}
      </div>
    </aside>
  );
}
