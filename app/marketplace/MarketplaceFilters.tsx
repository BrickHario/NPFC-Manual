"use client";

import { MARKET_LABELS } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./MarketplaceFilters.module.css";

type Props = {
  positions: string[];
  feet: string[];
  markets: string[];
  skillNames: string[];
  playerNames: string[];
  selectedPositions: string[];
  selectedMarkets: string[];
  selectedTiers: string[];
  selectedFoot: string;
  search: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
  selectedPotential: string;
};

const MARKET_ORDER: Record<string, number> = {
  "100%": 0,
  "25%": 1,
  "20%": 2,
};

function marketKey(value: string) {
  return value.replace(/\s+/g, "");
}

function MultiFilter({
  label,
  name,
  options,
  selected,
  open,
  onToggle,
}: {
  label: string;
  name: string;
  options: string[];
  selected: string[];
  open: boolean;
  onToggle: () => void;
}) {
  const orderedOptions = name === "market"
    ? [...options].sort((a, b) =>
        (MARKET_ORDER[marketKey(a)] ?? 99) - (MARKET_ORDER[marketKey(b)] ?? 99) ||
        a.localeCompare(b, "de")
      )
    : options;

  return (
    <details
      key={`${name}:${selected.join("|")}`}
      open={open}
      data-marketplace-multifilter
      data-open={open}
      className={styles.multiFilter}
    >
      <summary
        className={`${styles.control} ${styles.filterSummary}`}
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className={styles.counter}>{selected.length}</span>
        )}
      </summary>

      <div className={styles.filterMenu}>
        {orderedOptions.map((option) => (
          <label key={option} className={styles.optionLabel}>
            <input
              className={styles.checkbox}
              type="checkbox"
              name={name}
              value={option}
              defaultChecked={selected.includes(option)}
            />
            <span>
              {name === "market"
                ? MARKET_LABELS[marketKey(option)] ?? option
                : name === "tier" && option === "Silber"
                  ? "Silver"
                  : option}
            </span>
          </label>
        ))}
      </div>
    </details>
  );
}


type SingleOption = {
  value: string;
  label: string;
};

function SingleFilter({
  label,
  options,
  selected,
  open,
  onToggle,
  onSelect,
  wide = false,
}: {
  label: string;
  options: SingleOption[];
  selected: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  wide?: boolean;
}) {
  const selectedLabel = options.find((option) => option.value === selected)?.label ?? label;

  return (
    <div
      className={`${styles.multiFilter} ${styles.singleFilter} ${wide ? styles.sortFilter : ""}`}
      data-marketplace-multifilter
      data-open={open}
    >
      <button
        type="button"
        className={`${styles.control} ${styles.filterSummary}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        onClick={onToggle}
      >
        <span className={styles.filterText}>{selectedLabel}</span>
      </button>

      {open && (
        <div className={styles.filterMenu} role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === selected}
              className={`${styles.optionButton} ${option.value === selected ? styles.optionSelected : ""}`}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarketplaceFilters({
  positions,
  feet,
  markets,
  skillNames,
  playerNames,
  selectedPositions,
  selectedMarkets,
  selectedTiers,
  selectedFoot,
  search,
  sort,
  minPrice,
  maxPrice,
  selectedPotential,
}: Props) {
  const [query, setQuery] = useState(search);
  const [minPriceValue, setMinPriceValue] = useState(minPrice);
  const [maxPriceValue, setMaxPriceValue] = useState(maxPrice);
  const [sortValue, setSortValue] = useState(sort);
  const [footValue, setFootValue] = useState(selectedFoot);
  const [potentialValue, setPotentialValue] = useState(selectedPotential);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(search), [search]);
  useEffect(() => setMinPriceValue(minPrice), [minPrice]);
  useEffect(() => setMaxPriceValue(maxPrice), [maxPrice]);
  useEffect(() => setSortValue(sort), [sort]);
  useEffect(() => setFootValue(selectedFoot), [selectedFoot]);
  useEffect(() => setPotentialValue(selectedPotential), [selectedPotential]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }

      const target = event.target;
      if (
        !(target instanceof Element) ||
        !target.closest("[data-marketplace-multifilter]")
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const suggestions = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de");
    if (needle.length < 2) return [];

    return playerNames
      .filter((name) => name.toLocaleLowerCase("de").includes(needle))
      .sort((a, b) => {
        const aStarts = a.toLocaleLowerCase("de").startsWith(needle);
        const bStarts = b.toLocaleLowerCase("de").startsWith(needle);
        return Number(bStarts) - Number(aStarts) || a.localeCompare(b, "de");
      })
      .slice(0, 8);
  }, [playerNames, query]);

  const priceSortActive = sortValue === "price_asc" || sortValue === "price_desc";

  return (
    <form
      className={styles.toolbar}
      action="/marketplace"
      method="get"
      onSubmit={() => {
        setShowSuggestions(false);
        setOpenDropdown(null);
      }}
    >
      <div
        ref={searchRef}
        className={styles.searchWrap}
        data-open={showSuggestions && suggestions.length > 0}
      >
        <input
          className={`${styles.control} ${styles.searchInput}`}
          type="search"
          name="q"
          placeholder="Search players..."
          value={query}
          autoComplete="off"
          aria-label="Search players"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-controls="marketplace-suggestions"
          onFocus={() => {
            setShowSuggestions(true);
            setOpenDropdown(null);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setShowSuggestions(false);
          }}
        />

        {showSuggestions && suggestions.length > 0 && (
          <ul
            id="marketplace-suggestions"
            role="listbox"
            className={styles.suggestions}
          >
            {suggestions.map((name) => (
              <li key={name} role="option" aria-selected={query === name}>
                <button
                  className={styles.suggestionButton}
                  type="button"
                  onClick={() => {
                    setQuery(name);
                    setShowSuggestions(false);
                  }}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MultiFilter
        label="Position"
        name="pos"
        options={positions}
        selected={selectedPositions}
        open={openDropdown === "pos"}
        onToggle={() => {
          setShowSuggestions(false);
          setOpenDropdown(openDropdown === "pos" ? null : "pos");
        }}
      />

      <input type="hidden" name="foot" value={footValue} />
      <SingleFilter
        label="All feet"
        options={[{ value: "", label: "All feet" }, ...feet.map((foot) => ({ value: foot, label: foot }))]}
        selected={footValue}
        open={openDropdown === "foot"}
        onToggle={() => {
          setShowSuggestions(false);
          setOpenDropdown(openDropdown === "foot" ? null : "foot");
        }}
        onSelect={(value) => {
          setFootValue(value);
          setOpenDropdown(null);
        }}
      />

      <MultiFilter
        label="Market"
        name="market"
        options={markets}
        selected={selectedMarkets}
        open={openDropdown === "market"}
        onToggle={() => {
          setShowSuggestions(false);
          setOpenDropdown(openDropdown === "market" ? null : "market");
        }}
      />

      <MultiFilter
        label="Tier"
        name="tier"
        options={["Ultra", "Gold", "Silber", "Bronze", "Alien"]}
        selected={selectedTiers}
        open={openDropdown === "tier"}
        onToggle={() => {
          setShowSuggestions(false);
          setOpenDropdown(openDropdown === "tier" ? null : "tier");
        }}
      />

      <div className={styles.priceGroup}>
        <input
          className={`${styles.control} ${styles.priceInput}`}
          type="number"
          name="minPrice"
          min="0"
          max="20000"
          step="50"
          placeholder="Price from"
          aria-label="Minimum price"
          value={minPriceValue}
          onChange={(event) => setMinPriceValue(event.target.value)}
        />
        <span className={styles.rangeSeparator}>–</span>
        <input
          className={`${styles.control} ${styles.priceInput}`}
          type="number"
          name="maxPrice"
          min="0"
          max="20000"
          step="50"
          placeholder="Price to"
          aria-label="Maximum price"
          value={maxPriceValue}
          onChange={(event) => setMaxPriceValue(event.target.value)}
        />

        <button
          className={`${styles.control} ${styles.priceSortButton} ${priceSortActive ? styles.priceSortActive : ""}`}
          type="button"
          aria-label={
            sortValue === "price_asc"
              ? "Switch to price: high to low"
              : "Switch to price: low to high"
          }
          title={
            sortValue === "price_asc"
              ? "Current: low to high. Click for high to low"
              : sortValue === "price_desc"
                ? "Current: high to low. Click for low to high"
                : "Sort by price: low to high"
          }
          aria-pressed={priceSortActive}
          onClick={() => {
            setOpenDropdown(null);
            setSortValue((current) =>
              current === "price_asc" ? "price_desc" : "price_asc"
            );
          }}
        >
          {sortValue === "price_desc" ? "↓" : "↑"}
        </button>
      </div>

      <input type="hidden" name="potential" value={potentialValue} />
      <SingleFilter
        label="Potential"
        options={[
          { value: "", label: "All potentials" },
          { value: "prepared", label: "Prepared" },
          { value: "development", label: "Development" },
          { value: "best", label: "Best" },
        ]}
        selected={potentialValue}
        open={openDropdown === "potential"}
        onToggle={() => {
          setShowSuggestions(false);
          setOpenDropdown(openDropdown === "potential" ? null : "potential");
        }}
        onSelect={(value) => {
          setPotentialValue(value);
          setOpenDropdown(null);
        }}
      />

      <input type="hidden" name="sort" value={sortValue} />
      <SingleFilter
        label="Sort by"
        wide
        options={[
          { value: "", label: "Sort by" },
          { value: "overall_desc", label: "Overall rating ↓" },
          { value: "overall_asc", label: "Overall rating ↑" },
          { value: "name_asc", label: "Name A–Z" },
          { value: "name_desc", label: "Name Z–A" },
          ...skillNames.flatMap((skill, index) => [
            { value: `skill:${index}:desc`, label: `${skill} ↓` },
            { value: `skill:${index}:asc`, label: `${skill} ↑` },
          ]),
        ]}
        selected={sortValue.startsWith("price_") ? "" : sortValue}
        open={openDropdown === "sort"}
        onToggle={() => {
          setShowSuggestions(false);
          setOpenDropdown(openDropdown === "sort" ? null : "sort");
        }}
        onSelect={(value) => {
          setSortValue(value === "" ? "overall_desc" : value);
          setOpenDropdown(null);
        }}
      />

      <button className={styles.applyButton} type="submit">Apply</button>
      <a className={styles.resetLink} href="/marketplace">Reset</a>
    </form>
  );
}
