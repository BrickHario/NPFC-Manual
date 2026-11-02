import { getAttributeImage } from '@/lib/utils';
import type { TrainingCard, TrainingCombo } from './types';

export const ATTRIBUTES = [
  { key: 'shoot', label: 'Shoot', fields: ['skill_01', 'skill_02'] },
  { key: 'speed', label: 'Speed', fields: ['skill_03'] },
  { key: 'stamina', label: 'Stamina', fields: ['skill_04'] },
  { key: 'technic', label: 'Technic', fields: ['skill_05', 'skill_06', 'skill_07'] },
  { key: 'strength', label: 'Strength', fields: ['skill_08'] },
  { key: 'jump', label: 'Jump', fields: ['skill_09'] },
  { key: 'will', label: 'Will', fields: ['skill_10'] },
] as const;

export type AttributeKey = (typeof ATTRIBUTES)[number]['key'];
export type AttributeValues = Record<AttributeKey, number>;

export function comboAttributeValues(combo: TrainingCombo | TrainingCard): AttributeValues {
  const values = {} as AttributeValues;
  for (const attribute of ATTRIBUTES) {
    const total = attribute.fields.reduce((sum, key) => sum + Number(combo[key] ?? 0), 0);
    values[attribute.key] = total / attribute.fields.length;
  }
  return values;
}

export function attributeIcon(label: string, index: number) {
  return getAttributeImage(label, index);
}
