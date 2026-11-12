
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
