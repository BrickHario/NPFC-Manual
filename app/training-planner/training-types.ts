
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
  groupId?: number;
};

export type TrainingEntry = {
  kind: TrainingKind;
  id: number;
  hasMatchActions: boolean;
  names: TrainingNames;
  imageUrl: string;
  potChanges: number[];
  skillChanges: number[];
  fatigueChange: number;
  xtra_01?: number;
  xtra_02?: number;
  requiredCardIds?: number[];
};

export function getTrainingGroups(selected: SelectedTraining[]): SelectedTraining[][] {
  const groups: SelectedTraining[][] = [];

  for (const item of selected) {
    const last = groups[groups.length - 1];

    if (
      item.kind === "card" &&
      item.groupId !== undefined &&
      last?.[0]?.kind === "card" &&
      last[0].groupId === item.groupId &&
      last.length < 3 &&
      !last.some((card) => card.id === item.id)
    ) {
      last.push(item);
    } else {
      groups.push([item]);
    }
  }

  return groups;
}

export function combineTrainingPots(entries: TrainingEntry[]): number[] {
  return Array.from({ length: 12 }, (_, index) => {
    const sum = entries.reduce((total, entry) => total + (entry.potChanges[index] ?? 0), 0);
    return Math.max(-30, Math.min(30, sum));
  });
}

export function getGroupedTrainingFatigue(entries: TrainingEntry[]): number {
  if (entries.length === 1) return entries[0].fatigueChange ?? 0;
  const sum = entries.reduce((total, entry) =>
    total + entry.skillChanges.slice(0, 9).reduce((a, b) => a + b, 0), 0);
  if (entries.length === 2) return Math.max(0, Math.trunc(sum * 10 / 3));
  if (entries.length === 3) return Math.max(0, Math.trunc(sum * 10 / 2));
  return 0;
}
