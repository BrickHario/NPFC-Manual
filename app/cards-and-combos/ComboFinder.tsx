
"use client";

import { useEffect, useMemo, useState } from "react";
import { comboAttributeValues, type AttributeKey } from "./attributes";
import { requiredCards, type TrainingCard, type TrainingCombo } from "./types";
import {
  CATEGORIES,
  isEnabled,
  STORAGE_KEY,
  type SortValue,
} from "./combo-config";
import CardButtons from "./CardButtons";
import ComboFilters from "./ComboFilters";
import ComboTable, { type ResultRow } from "./ComboTable";
import styles from "./cards-and-combos.module.css";

type Props = {
  cards: TrainingCard[];
  combos: TrainingCombo[];
  cardImageUrls: Record<number, string>;
  comboImageUrls: Record<number, string>;
};

type SavedSelection = {
  cards: number[];
  showSingleCards: boolean;
  showCardsFirst?: boolean;
  twOnly?: boolean;
  matchActionsOnly?: boolean;
};

type ComboFlags = {
  gk_only?: boolean | number | string | null;
  has_match_actions?: boolean | number | string | null;
};

const collator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function sortRows(
  a: ResultRow,
  b: ResultRow,
  sort: SortValue
): number {
  let comparison = 0;

  if (sort === "name_asc" || sort === "name_desc") {
    comparison = collator.compare(a.name, b.name);

    if (sort === "name_desc") {
      comparison *= -1;
    }
  } else if (
    sort === "category_asc" ||
    sort === "category_desc"
  ) {
    comparison = collator.compare(
      CATEGORIES[a.category] ?? "",
      CATEGORIES[b.category] ?? ""
    );

    if (sort === "category_desc") {
      comparison *= -1;
    }
  } else {
    const [, key, direction] = sort.split(":") as [
      string,
      AttributeKey,
      "asc" | "desc",
    ];

    comparison =
      comboAttributeValues(a.data)[key] -
      comboAttributeValues(b.data)[key];

    if (direction === "desc") {
      comparison *= -1;
    }
  }

  return (
    comparison ||
    collator.compare(a.name, b.name) ||
    a.id - b.id
  );
}

export default function CardsAndCombos({
  cards,
  combos,
  cardImageUrls,
  comboImageUrls,
}: Props) {
  const [selectedCards, setSelectedCards] = useState<Set<number>>(
    () => new Set()
  );

  const [showSingleCards, setShowSingleCards] = useState(true);
  const [showCardsFirst, setShowCardsFirst] = useState(true);

  const [twOnly, setTwOnly] = useState(false);
  const [matchActionsOnly, setMatchActionsOnly] = useState(false);

  const [storageLoaded, setStorageLoaded] = useState(false);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortValue>("name_asc");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const saved = JSON.parse(stored) as Partial<SavedSelection>;
        const validIds = new Set(
          cards.map((card) => card.card_id)
        );

        setSelectedCards(
          new Set(
            (Array.isArray(saved.cards) ? saved.cards : []).filter(
              (id): id is number =>
                typeof id === "number" && validIds.has(id)
            )
          )
        );

        setShowSingleCards(saved.showSingleCards !== false);
        setShowCardsFirst(saved.showCardsFirst !== false);

        setTwOnly(saved.twOnly === true);
        setMatchActionsOnly(saved.matchActionsOnly === true);
      }
    } catch (error) {
      console.warn(
        "Could not restore training selection.",
        error
      );
    } finally {
      setStorageLoaded(true);
    }
  }, [cards]);

  useEffect(() => {
    if (!storageLoaded) return;

    const data: SavedSelection = {
      cards: [...selectedCards],
      showSingleCards,
      showCardsFirst,
      twOnly,
      matchActionsOnly,
    };

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
      );
    } catch (error) {
      console.warn(
        "Could not save training selection.",
        error
      );
    }
  }, [
    selectedCards,
    showSingleCards,
    showCardsFirst,
    twOnly,
    matchActionsOnly,
    storageLoaded,
  ]);

  const cardNames = useMemo(
    () =>
      new Map(
        cards.map((card) => [
          card.card_id,
          card.name,
        ])
      ),
    [cards]
  );

  const allSelected =
    cards.length > 0 &&
    cards.every((card) =>
      selectedCards.has(card.card_id)
    );

  const visibleRows = useMemo(() => {
    const specialFilterActive =
      twOnly || matchActionsOnly;

    // Single cards are hidden when special combo filters are active.
    const singleRows: ResultRow[] =
      showSingleCards && !specialFilterActive
        ? cards
            .filter((card) =>
              selectedCards.has(card.card_id)
            )
            .map((card) => ({
              kind: "card" as const,
              id: card.card_id,
              name: card.name,
              category: 1,
              data: card,
            }))
        : [];

    const comboRows: ResultRow[] = combos
      .filter((combo) => {
        // Required training cards must be selected.
        if (
          !requiredCards(combo).every((id) =>
            selectedCards.has(id)
          )
        ) {
          return false;
        }

        const flags = combo as TrainingCombo & ComboFlags;

        if (twOnly && !isEnabled(flags.gk_only)) {
          return false;
        }

        if (
          matchActionsOnly &&
          !isEnabled(flags.has_match_actions)
        ) {
          return false;
        }

        return true;
      })
      .map((combo) => ({
        kind: "combo" as const,
        id: combo.combo_id,
        name: combo.name,
        category: combo.category_id,
        data: combo,
      }));

    const search = query
      .trim()
      .toLocaleLowerCase("en");

    const matches = (row: ResultRow) => {
      if (!search) return true;

      const recipeNames =
        row.kind === "card"
          ? [row.name]
          : requiredCards(row.data).map(
              (id) =>
                cardNames.get(id) ?? `Card #${id}`
            );

      return (
        row.name
          .toLocaleLowerCase("en")
          .includes(search) ||
        recipeNames.some((name) =>
          name
            .toLocaleLowerCase("en")
            .includes(search)
        ) ||
        (CATEGORIES[row.category] ?? "")
          .toLocaleLowerCase("en")
          .includes(search)
      );
    };

    const filteredCards = singleRows.filter(matches);
    const filteredCombos = comboRows.filter(matches);

    if (showCardsFirst) {
      return [
        ...filteredCards.sort((a, b) =>
          sortRows(a, b, sort)
        ),
        ...filteredCombos.sort((a, b) =>
          sortRows(a, b, sort)
        ),
      ];
    }

    return [
      ...filteredCards,
      ...filteredCombos,
    ].sort((a, b) =>
      sortRows(a, b, sort)
    );
  }, [
    cards,
    combos,
    selectedCards,
    showSingleCards,
    showCardsFirst,
    twOnly,
    matchActionsOnly,
    query,
    sort,
    cardNames,
  ]);

  function toggleCard(cardId: number) {
    setSelectedCards((previous) => {
      const next = new Set(previous);

      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }

      return next;
    });
  }

  function toggleAllCards() {
    setSelectedCards(
      allSelected
        ? new Set()
        : new Set(
            cards.map((card) => card.card_id)
          )
    );
  }

  function resetFilters() {
    setQuery("");
    setSort("name_asc");

    setShowSingleCards(true);
    setShowCardsFirst(true);

    setTwOnly(false);
    setMatchActionsOnly(false);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.selectAll}
          onClick={toggleAllCards}
        >
          {allSelected
            ? "Deselect all cards"
            : "Select all cards"}
        </button>
      </header>

      <CardButtons
        cards={cards}
        selectedCards={selectedCards}
        onToggleCard={toggleCard}
        imageUrls={cardImageUrls}
      />

      <section
        className={styles.tableArea}
        aria-label="Training results"
      >
        <ComboFilters
          query={query}
          onQueryChange={setQuery}
          showSingleCards={showSingleCards}
          onShowSingleCardsChange={setShowSingleCards}
          showCardsFirst={showCardsFirst}
          onShowCardsFirstChange={setShowCardsFirst}
          twOnly={twOnly}
          onTwOnlyChange={setTwOnly}
          matchActionsOnly={matchActionsOnly}
          onMatchActionsOnlyChange={setMatchActionsOnly}
          sort={sort}
          onSortChange={setSort}
          onReset={resetFilters}
        />

        <ComboTable
          rows={visibleRows}
          cardNames={cardNames}
          cardImageUrls={cardImageUrls}
          comboImageUrls={comboImageUrls}
        />
      </section>
    </div>
  );
}
