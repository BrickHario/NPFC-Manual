
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
import { calculatePlayerPosition, calculateTrainingStep } from "./player-type-calculation";
import { canUseTraining, combineTrainingPots, getTrainingGroups } from "./training-types";
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
  isGoalkeeper: boolean;
  focusTrainingKey?: string | null;
  selectionScope?: string | null;
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
  selectedCards: "Selected cards",
  selected: "Dummy",
  empty: "No training selected",
  noResults: "No matches",
  remove: "Remove training",
  reset: "Reset filters",
  match: {
    all: "No filter",
    fatigueHigh: "Fatigue High",
    fatigueLow: "Fatigue Low",
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
const CARD_SELECTION_STORAGE_KEY =
  "npfc-combo-finder-selection-v1";

type SavedFilters = {
  search: string;
  showCards: boolean;
  showCombos: boolean;
  selectedCardsOnly: boolean;
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
      selectedCardsOnly:
        filters.selectedCardsOnly === true,
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

function readSelectedCardIds(): Set<number> {
  try {
    const raw = localStorage.getItem(
      CARD_SELECTION_STORAGE_KEY
    );

    if (!raw) return new Set();

    const value: unknown = JSON.parse(raw);

    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return new Set();
    }

    const cards = (value as { cards?: unknown }).cards;

    if (!Array.isArray(cards)) {
      return new Set();
    }

    return new Set(
      cards.filter(
        (id): id is number =>
          typeof id === "number" &&
          Number.isSafeInteger(id) &&
          id >= 0
      )
    );
  } catch {
    return new Set();
  }
}

function getTrainingVector(
  pots: number[],
  potChanges: number[]
) {
  const start = calculatePlayerPosition(pots);
  const step = calculateTrainingStep(pots, potChanges);
  const dx = step.position.xRaw - start.xRaw;
  const dy = step.position.yRaw - start.yRaw;

  if (dx === 0 && dy === 0) {
    return {
      ...step,
      dx,
      dy,
      direction: "zero" as Direction,
    };
  }

  const sector =
    (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) %
    8;

  return {
    ...step,
    dx,
    dy,
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

function findSpecialCombo(items: SelectedTraining[], trainings: TrainingEntry[], isGoalkeeper: boolean) {
  if (items.length < 2 || items.length > 3 || items.some((item) => item.kind !== "card")) return undefined;

  const ids = items.map((item) => item.id).sort((a, b) => a - b);

  return trainings.find((entry) => {
    if (entry.kind !== "combo" || !canUseTraining(entry, isGoalkeeper) || entry.requiredCardIds?.length !== ids.length) return false;

    const required = [...entry.requiredCardIds].sort((a, b) => a - b);
    return required.every((id, index) => id === ids[index]);
  });
}

export default function TrainingSelectFilter({
  language,
  trainings,
  onSelectionChange,
  startPots,
  selected,
  selectedPlayerName,
  hasSelectedPlayer,
  isGoalkeeper,
  focusTrainingKey,
  selectionScope,
}: TrainingSelectFilterProps) {
  const [search, setSearch] = useState("");
  const [focusedSearch, setFocusedSearch] = useState<string | null>(null);
  const [showCards, setShowCards] = useState(true);
  const [showCombos, setShowCombos] = useState(true);
  const [selectedCardsOnly, setSelectedCardsOnly] =
    useState(false);
  const [savedCardIds, setSavedCardIds] = useState<
    Set<number>
  >(new Set());

  const [direction, setDirection] =
    useState<Direction>("all");

  const [dragOverId, setDragOverId] =
    useState<number | null>(null);

  const [matchFilter, setMatchFilter] =
    useState<MatchFilter>("all");

  const [filtersLoaded, setFiltersLoaded] =
    useState(false);

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
      setSelectedCardsOnly(saved.selectedCardsOnly);
      setDirection(saved.direction);
      setMatchFilter(saved.matchFilter);
    }

    setFiltersLoaded(true);
  }, []);

  useEffect(() => {
    if (!filtersLoaded || focusedSearch !== null) return;

    const filters: SavedFilters = {
      search,
      showCards,
      showCombos,
      selectedCardsOnly,
      direction,
      matchFilter,
    };

    localStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify(filters)
    );
  }, [
    filtersLoaded,
    focusedSearch,
    search,
    showCards,
    showCombos,
    selectedCardsOnly,
    direction,
    matchFilter,
  ]);

  useEffect(() => {
    const updateSelectedCards = () => {
      setSavedCardIds(readSelectedCardIds());
    };

    updateSelectedCards();

    window.addEventListener("focus", updateSelectedCards);
    window.addEventListener("storage", updateSelectedCards);
    window.addEventListener("pageshow", updateSelectedCards);

    return () => {
      window.removeEventListener(
        "focus",
        updateSelectedCards
      );
      window.removeEventListener(
        "storage",
        updateSelectedCards
      );
      window.removeEventListener(
        "pageshow",
        updateSelectedCards
      );
    };
  }, []);

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

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );
    document.addEventListener(
      "keydown",
      handleKeyDown
    );

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

  useEffect(() => {
    if (!focusTrainingKey || !filtersLoaded) return;

    const entry = catalog.get(focusTrainingKey);
    if (!entry) return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has("trainingKind") || !url.searchParams.has("trainingId")) return;

    setFocusedSearch(entry.names[language]);
    setShowCards(true);
    setShowCombos(true);
    setSelectedCardsOnly(false);
    setDirection("all");
    setMatchFilter("all");

    url.searchParams.delete("trainingKind");
    url.searchParams.delete("trainingId");
    window.history.replaceState(null, "", url.toString());
  }, [focusTrainingKey, catalog, language, filtersLoaded]);

  const trainingGroups = useMemo(
    () => getTrainingGroups(selected),
    [selected]
  );

  const [marked, setMarked] = useState<{
    scope: string | null | undefined;
    ids: number[];
  }>({ scope: undefined, ids: [] });

  const markedIds = marked.scope === selectionScope ? marked.ids : [];
  const markedGroups = trainingGroups.filter((group) =>
    markedIds.includes(group[0].instanceId)
  );
  const canGroup = markedGroups.length >= 2 && markedGroups.length <= 3 &&
    markedGroups.every((group) => group.length === 1 && group[0].kind === "card") &&
    new Set(markedGroups.map((group) => group[0].id)).size === markedGroups.length;
  const canUngroup = markedGroups.length === 1 && markedGroups[0].length > 1;
  const markedCombo = canGroup
    ? findSpecialCombo(markedGroups.flat(), trainings, isGoalkeeper)
    : undefined;

  useEffect(() => {
    function handleOutsideClick(event: PointerEvent) {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest("[data-training-markable], [data-training-group-action]")) return;

      setMarked((current) =>
        current.ids.length > 0 ? { ...current, ids: [] } : current
      );
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, []);

  function clearMarked() {
    setMarked({ scope: selectionScope, ids: [] });
  }

  function toggleMarked(group: SelectedTraining[]) {
    if (group[0].kind !== "card") return;
    const id = group[0].instanceId;

    if (markedIds.includes(id)) {
      setMarked({ scope: selectionScope, ids: markedIds.filter((value) => value !== id) });
      return;
    }

    if (group.length > 1 || canUngroup) {
      setMarked({ scope: selectionScope, ids: [id] });
      return;
    }

    if (markedGroups.length >= 3 || markedGroups.some((value) => value[0].id === group[0].id)) return;
    setMarked({ scope: selectionScope, ids: [...markedGroups.map((value) => value[0].instanceId), id] });
  }

  function groupMarked() {
    if (!canGroup) return;
    const ids = new Set(markedGroups.map((group) => group[0].instanceId));
    const groupId = Math.max(-1, ...selected.map((item) => item.groupId ?? -1)) + 1;
    const first = markedGroups[0][0].instanceId;
    const grouped: SelectedTraining[] = markedCombo
      ? [{ kind: "combo", id: markedCombo.id, instanceId: first }]
      : markedGroups.map(([item]) => ({ ...item, groupId }));
    onSelectionChange(selected.flatMap((item) =>
      item.instanceId === first ? grouped : ids.has(item.instanceId) ? [] : [item]
    ));
    clearMarked();
  }

  function ungroupMarked() {
    if (!canUngroup) return;
    const ids = new Set(markedGroups[0].map((item) => item.instanceId));
    onSelectionChange(selected.map((item) =>
      ids.has(item.instanceId) ? { ...item, groupId: undefined } : item
    ));
    clearMarked();
  }

  const { selectedVectors, previewPots } = useMemo(() => {
    const vectors = new Map<
      number,
      ReturnType<typeof getTrainingVector>
    >();

    let currentPots = [...startPots];

    for (const group of trainingGroups) {
      const entries = group.flatMap((item) => {
        const entry = catalog.get(entryKey(item));
        return entry ? [entry] : [];
      });
      if (entries.length !== group.length) continue;

      const vector = getTrainingVector(currentPots, combineTrainingPots(entries));
      vectors.set(group[0].instanceId, vector);
      currentPots = vector.nextPots;
    }

    return {
      selectedVectors: vectors,
      previewPots: currentPots,
    };
  }, [trainingGroups, catalog, startPots]);

  const trainingVectors = useMemo(
    () =>
      new Map(
        trainings.map((entry) => [
          entryKey(entry),
          getTrainingVector(
            previewPots,
            combineTrainingPots([entry])
          ),
        ])
      ),
    [trainings, previewPots]
  );

  const options = useMemo(() => {
    const query = (focusedSearch ?? search).trim().toLocaleLowerCase();

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
        if (selectedCardsOnly) {
          if (entry.kind === "card") {
            if (!savedCardIds.has(entry.id)) {
              return false;
            }
          } else {
            const required = entry.requiredCardIds;

            if (
              !required ||
              required.length === 0 ||
              !required.every((id) =>
                savedCardIds.has(id)
              )
            ) {
              return false;
            }
          }
        }

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
        if (matchFilter === "fatigueHigh") {
          const difference = b.fatigueChange - a.fatigueChange;
          if (difference !== 0) return difference;
        }

        if (matchFilter === "fatigueLow") {
          const difference = a.fatigueChange - b.fatigueChange;
          if (difference !== 0) return difference;
        }

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
    focusedSearch,
    selectedCardsOnly,
    savedCardIds,
    matchFilter,
    direction,
  ]);

  function addTraining(entry: TrainingEntry) {
    if (!hasSelectedPlayer || !canUseTraining(entry, isGoalkeeper)) return;

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

  function removeTraining(group: SelectedTraining[]) {
    clearMarked();
    const ids = new Set(group.map((item) => item.instanceId));
    onSelectionChange(
      selected.filter(
        (item) => !ids.has(item.instanceId)
      )
    );
  }

  function clearTrainings() {
    clearMarked();
    onSelectionChange([]);
  }

  function moveTraining(
    fromId: number,
    toId: number
  ) {
    const fromIndex = trainingGroups.findIndex(
      (group) => group[0].instanceId === fromId
    );

    const toIndex = trainingGroups.findIndex(
      (group) => group[0].instanceId === toId
    );

    if (
      fromIndex === -1 ||
      toIndex === -1 ||
      fromIndex === toIndex
    ) {
      return;
    }

    const updated = [...trainingGroups];
    const [moved] = updated.splice(fromIndex, 1);

    updated.splice(toIndex, 0, moved);
    onSelectionChange(updated.flat());
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
  setFocusedSearch(null);
  setSearch("");
  setShowCards(true);
  setShowCombos(true);
  setSelectedCardsOnly(false);
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
              value={focusedSearch ?? search}
              onChange={(event) => {
                setFocusedSearch(null);
                setSearch(event.target.value);
              }}
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

            <label className={styles.optionLabel}>
              <input
                className={styles.checkbox}
                type="checkbox"
                checked={selectedCardsOnly}
                onChange={(event) => {
                  setSavedCardIds(readSelectedCardIds());
                  setSelectedCardsOnly(
                    event.target.checked
                  );
                }}
              />
              <span>{labels.selectedCards}</span>
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
                {(
                  Object.keys(labels.match) as MatchFilter[]
                ).map((option) => (
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
              <p className={styles.empty} style={{paddingTop: 40}}>
                {labels.noResults}
              </p>
            )}

            {options.map((entry) => (
              <button
                type="button"
                className={styles.availableItem}
                key={entryKey(entry)}
                onClick={() => addTraining(entry)}
                disabled={!hasSelectedPlayer || !canUseTraining(entry, isGoalkeeper)}
                aria-label={entry.names[language]}
                title={
                  hasSelectedPlayer
                    ? canUseTraining(entry, isGoalkeeper)
                      ? entry.names[language]
                      : "GK only – select a goalkeeper"
                    : "Select a player to add training"
                }
              >
                <span className={styles.availableImage} style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      zIndex: 2,
                      padding: "3px 5px",
                      borderRadius: 5,
                      background: "#0d0d0db4",
                      color: "white",
                      fontSize: 12,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                    title={`Fatigue +${entry.fatigueChange}`}
                  >
                    +{entry.fatigueChange}
                  </span>
                  <Image
                    src={entry.imageUrl}
                    alt=""
                    width={150}
                    height={98}
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
        </div>
      </div>

      <div className={styles.selectedHeader} style={!hasSelectedPlayer ? { marginTop: 48 } : undefined}>
        {hasSelectedPlayer && (
          <h3 className={styles.playerTitle}>
            Order for {selectedPlayerName || "Dummy"}:
          </h3>
        )}
        {(canGroup || canUngroup) && (
          <button
            type="button"
            style={{background: "#555555"}}
            className={styles.deleteAllButton}
            data-training-group-action
            onClick={canGroup ? groupMarked : ungroupMarked}
          >
            {canGroup ? "Group" : "Ungroup"}
          </button>
        )}
        {selected.length > 0 && (
          <button
            type="button"
            style={{background: "#cf3434"}}
            className={styles.deleteAllButton}
            onClick={clearTrainings}
          >
            Delete All
          </button>
        )}
      </div>

      <div style={{ position: "relative", width: "100%", minWidth: 0 }}>
        <style>{`
          @keyframes npfcSpecialComboPulse {
            0%, 100% { opacity: 1; scale: 1; }
            25% { opacity: 0.35; scale: 0.92; }
            50% { opacity: 1; scale: 1.08; }
            75% { opacity: 0.65; scale: 0.98; }
          }
          .npfc-special-combo-image {
            animation: npfcSpecialComboPulse 1s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .npfc-special-combo-image { animation: none; }
          }
        `}</style>
        {markedCombo && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", zIndex: 20, pointerEvents: "none" }}>
            <Image
              src="/special-combo-text.png"
              alt="Special Combo"
              title={markedCombo.names[language]}
              width={150}
              height={80}
              className="npfc-special-combo-image"
              style={{ width: "150px", maxWidth: "80%", height: "auto", objectFit: "contain" }}
              unoptimized
              draggable={false}
            />
          </div>
        )}
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

        {trainingGroups
          .map((group, index) => ({ group, index }))
          .reverse()
          .map(({ group, index }) => (
            <div
              key={group[0].instanceId}
              data-training-markable={group[0].kind === "card" ? "true" : undefined}
              role={group[0].kind === "card" ? "button" : undefined}
              tabIndex={group[0].kind === "card" ? 0 : undefined}
              aria-pressed={group[0].kind === "card" ? markedIds.includes(group[0].instanceId) : undefined}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("button, a")) return;
                toggleMarked(group);
              }}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget || group[0].kind !== "card") return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleMarked(group);
                }
              }}
              draggable
              onDragStart={(event) =>
                handleDragStart(event, group[0].instanceId)
              }
              onDragOver={(event) =>
                handleDragOver(event, group[0].instanceId)
              }
              onDrop={(event) =>
                handleDrop(event, group[0].instanceId)
              }
              onDragEnd={handleDragEnd}
              style={{
                display: "flex",
                flexShrink: 0,
                alignItems: "center",
                gap: 0,
                isolation: "isolate",
                cursor: group[0].kind === "card" ? "pointer" : undefined,
                outline: markedIds.includes(group[0].instanceId)
                  ? "3px solid var(--color-highlight, #5581dd)"
                  : undefined,
                outlineOffset: 5,
                borderRadius: 12,
                position: "relative",
              }}
            >
              {group.map((item, cardIndex) => {
            const entry = catalog.get(entryKey(item));

            if (!entry) return null;

            return (
              <div
                className={`${styles.selectedItem} ${
                  dragOverId === group[0].instanceId
                    ? styles.dragOver
                    : ""
                }`}
                key={item.instanceId}
                style={{
                  marginLeft: cardIndex > 0 ? -12 : 0,
                  zIndex: group.length - cardIndex,
                }}

              >
                {cardIndex === 0 && (
                  <span className={styles.itemNumber}>
                    {index + 1}.
                  </span>
                )}

                <div className={styles.trainingCard}>
                  <span className={styles.availableImage}>
                    <Image
                      src={entry.imageUrl}
                      alt=""
                      width={150}
                      height={98}
                      draggable={false}
                    />

                    <span className={styles.availableName}>
                      {entry.names[language]}
                    </span>

                    {cardIndex === 0 && (
                    <span className={styles.availableVector} title={group.length > 1 ? "Combined training vector" : undefined}>
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
                    )}
                  </span>
                </div>

                {cardIndex === group.length - 1 && (
                  <button
                    className={styles.removeButton}
                    type="button"
                    draggable={false}
                    aria-label={labels.remove}
                    onClick={() => removeTraining(group)}
                  >
                    ×
                  </button>
                )}

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
          ))}
      </div>
      </div>
    </aside>
  );
}
