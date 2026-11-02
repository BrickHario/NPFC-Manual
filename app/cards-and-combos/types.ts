/** Columns verified against the provided public Supabase schema. */
export type SkillKey = `skill_${'01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'}`;
export type PotentialKey = `pot_${'01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'|'11'|'12'}`;
export type ExtraKey = 'xtra_01' | 'xtra_02';
export type ValueKey = SkillKey | PotentialKey | ExtraKey;
export type Values = Record<ValueKey, number>;
export type CardRow = Values & { card_id: number; category_id: number; random_01: number };
export type ComboRow = Values & {
  combo_id: number;
  card1_id: number;
  card2_id: number;
  card3_id: number | null;
  category_id: number;
  gk_only: boolean;
  has_match_actions: boolean;
};
export type CardNameRow = { card_id: number; english_name: string };
export type ComboNameRow = { combo_id: number; english_name: string };
export type TrainingCard = CardRow & { name: string };
export type TrainingCombo = ComboRow & { name: string };
export type ViewMode = 'skill' | 'pot' | 'xtra';
export type SortKey = 'name' | 'category' | 'id' | 'total' | ValueKey;

export const VALUE_KEYS: Record<ViewMode, readonly ValueKey[]> = {
  skill: Array.from({ length: 10 }, (_, i) => `skill_${String(i + 1).padStart(2, '0')}` as SkillKey),
  pot: Array.from({ length: 12 }, (_, i) => `pot_${String(i + 1).padStart(2, '0')}` as PotentialKey),
  xtra: ['xtra_01', 'xtra_02'],
};

export function sumValues(row: Values, mode: ViewMode): number {
  return VALUE_KEYS[mode].reduce((total, key) => total + (row[key] ?? 0), 0);
}

export function requiredCards(combo: TrainingCombo): number[] {
  return combo.card3_id == null
    ? [combo.card1_id, combo.card2_id]
    : [combo.card1_id, combo.card2_id, combo.card3_id];
}
