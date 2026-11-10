import { AttributeKey, ATTRIBUTES } from "./attributes";

export type CardGroup =
  | "tactical"
  | "technical"
  | "physical"
  | "support";

export type SortValue =
  | "name_asc"
  | "name_desc"
  | "category_asc"
  | "category_desc"
  | "direction:up"
  | "direction:right"
  | "direction:down"
  | "direction:left"
  | "direction:zero"
  | `attribute:${AttributeKey}:${"asc" | "desc"}`;

export const CARD_GROUPS: {
  key: CardGroup;
  label: string;
}[] = [
  { key: "tactical", label: "Tactical" },
  { key: "technical", label: "Technical" },
  { key: "physical", label: "Physical" },
  { key: "support", label: "Support" },
];

export const CATEGORIES: Record<number, string> = {
  1: "Card",
  2: "Attacking",
  3: "Celebration",
  4: "Defending",
  5: "Fitness",
  6: "Goalkeeper",
  7: "Midfield",
  8: "Mindset",
  9: "Skill",
  10: "Trash",
};

export const SORT_OPTIONS: {
  value: SortValue;
  label: string;
}[] = [
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "category_asc", label: "Category A–Z" },
  { value: "category_desc", label: "Category Z–A" },
  { value: "direction:up", label: "Direction Up" },
  { value: "direction:right", label: "Direction Right" },
  { value: "direction:down", label: "Direction Down" },
  { value: "direction:left", label: "Direction Left" },
  { value: "direction:zero", label: "Direction Zero" },
  ...ATTRIBUTES.flatMap((attribute) => [
    {
      value: `attribute:${attribute.key}:desc` as SortValue,
      label: `${attribute.label} ↓`,
    },
    {
      value: `attribute:${attribute.key}:asc` as SortValue,
      label: `${attribute.label} ↑`,
    },
  ]),
];

export const STORAGE_KEY =
  "npfc-combo-finder-selection-v1";

// Keep the existing provisional grouping.
export function getCardGroup(cardId: number): CardGroup {
  if (cardId <= 6) return "tactical";
  if (cardId <= 13) return "technical";
  if (cardId <= 20) return "physical";
  return "support";
}

export function isEnabled(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true"
  );
}

export function formatBonus(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";

  const rounded = Math.ceil(Math.abs(value));
  return value > 0 ? `+${rounded}` : `−${rounded}`;
}
