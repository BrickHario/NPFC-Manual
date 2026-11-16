import type { AttributeKey } from "./attributes";

export type CardGroup =
  | "tactical"
  | "technical"
  | "physical"
  | "support";

export const SORT_SKILLS = [
  { key: "skill_01", label: "Shoot Accuracy" },
  { key: "skill_02", label: "Shoot Power" },
  { key: "skill_03", label: "Speed" },
  { key: "skill_04", label: "Stamina" },
  { key: "skill_05", label: "Dribbling" },
  { key: "skill_06", label: "Tackling" },
  { key: "skill_07", label: "Ball Control" },
  { key: "skill_08", label: "Strength" },
  { key: "skill_09", label: "Jump" },
  { key: "skill_10", label: "Will" },
] as const;

export type SkillSortKey = (typeof SORT_SKILLS)[number]["key"];

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
  | "fatigue_desc"
  | "fatigue_asc"
  | `attribute:${AttributeKey}:${"asc" | "desc"}`
  | `skill:${SkillSortKey}:${"asc" | "desc"}`;

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
  { value: "category_asc", label: "Group A–Z" },
  { value: "category_desc", label: "Group Z–A" },
  { value: "direction:up", label: "Direction Up" },
  { value: "direction:right", label: "Direction Right" },
  { value: "direction:down", label: "Direction Down" },
  { value: "direction:left", label: "Direction Left" },
  { value: "direction:zero", label: "Direction Zero" },
  { value: "fatigue_desc", label: "Fatigue High" },
  { value: "fatigue_asc", label: "Fatigue Low" },
  ...SORT_SKILLS.flatMap((skill) => [
    {
      value: `skill:${skill.key}:desc` as SortValue,
      label: `${skill.label} ↓`,
    },
    {
      value: `skill:${skill.key}:asc` as SortValue,
      label: `${skill.label} ↑`,
    },
  ]),
];

export const STORAGE_KEY =
  "npfc-combo-finder-selection-v1";

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

export function formatBonus(value: number, random_01 = 0): string {
  if (random_01 !== 0) return "?";
  if (!Number.isFinite(value) || value === 0) return "";

  const rounded = Math.ceil(Math.abs(value));
  return value > 0 ? `+${rounded}` : `−${rounded}`;
}
