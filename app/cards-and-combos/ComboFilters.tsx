
"use client";

import { useEffect, useRef, useState } from "react";
import {
  SORT_OPTIONS,
  type SortValue,
} from "./combo-config";
import styles from "./cards-and-combos.module.css";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  showSingleCards: boolean;
  onShowSingleCardsChange: (value: boolean) => void;
  twOnly: boolean;
  onTwOnlyChange: (value: boolean) => void;
  matchActionsOnly: boolean;
  onMatchActionsOnlyChange: (value: boolean) => void;
  sort: SortValue;
  onSortChange: (value: SortValue) => void;
  onReset: () => void;
  showCardsFirst: boolean;
  onShowCardsFirstChange: (value: boolean) => void;
};

function FilterSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.switchControl}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />
      <span
        className={styles.toggleTrack}
        aria-hidden="true"
      />
      <span>{label}</span>
    </label>
  );
}

export default function ComboFilters({
  query,
  onQueryChange,
  showSingleCards,
  onShowSingleCardsChange,
  twOnly,
  onTwOnlyChange,
  matchActionsOnly,
  onMatchActionsOnlyChange,
  sort,
  onSortChange,
  onReset,
  showCardsFirst,
  onShowCardsFirstChange,
}: Props) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (
        !sortRef.current?.contains(
          event.target as Node
        )
      ) {
        setSortOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSortOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      onPointerDown
    );
    document.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        onPointerDown
      );
      document.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, []);

  const handleShowSingleCardsChange = (
    checked: boolean
  ) => {
    onShowSingleCardsChange(checked);

    if (!checked && showCardsFirst) {
      onShowCardsFirstChange(false);
    }
  };

  const handleShowCardsFirstChange = (
    checked: boolean
  ) => {
    if (checked && !showSingleCards) {
      onShowSingleCardsChange(true);
    }

    onShowCardsFirstChange(checked);
  };

  const sortLabel =
    SORT_OPTIONS.find(
      (option) => option.value === sort
    )?.label ?? "Sort by";

  return (
    <div className={styles.toolbar}>
      <div className={styles.searchWrap}>
        <input
          type="search"
          className={`${styles.control} ${styles.searchInput}`}
          placeholder="Search combos from table.."
          aria-label="Search combinations"
          value={query}
          onChange={(event) =>
            onQueryChange(event.target.value)
          }
        />
      </div>

      <FilterSwitch
        label="Show single cards"
        checked={showSingleCards}
        onChange={handleShowSingleCardsChange}
      />

      <FilterSwitch
        label="Show cards first"
        checked={showCardsFirst}
        onChange={handleShowCardsFirstChange}
      />

      <FilterSwitch
        label="GK only"
        checked={twOnly}
        onChange={onTwOnlyChange}
      />

      <FilterSwitch
        label="Match actions only"
        checked={matchActionsOnly}
        onChange={onMatchActionsOnlyChange}
      />

      <div
        ref={sortRef}
        className={styles.dropdown}
        data-open={sortOpen}
      >
        <button
          type="button"
          className={`${styles.control} ${styles.dropdownButton}`}
          aria-haspopup="listbox"
          aria-expanded={sortOpen}
          onClick={() =>
            setSortOpen((open) => !open)
          }
        >
          <span>{sortLabel}</span>
        </button>

        {sortOpen && (
          <div
            className={styles.dropdownMenu}
            role="listbox"
            aria-label="Sort results"
          >
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={
                  sort === option.value
                }
                className={`${styles.optionButton} ${
                  sort === option.value
                    ? styles.optionSelected
                    : ""
                }`}
                onClick={() => {
                  onSortChange(option.value);
                  setSortOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className={styles.resetButton}
        onClick={() => {
          onReset();
          setSortOpen(false);
        }}
      >
        Reset filters
      </button>
    </div>
  );
}
