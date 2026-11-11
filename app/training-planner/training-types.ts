
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
};

export type TrainingEntry = {
  kind: TrainingKind;
  id: number;
  hasMatchActions: boolean;
  names: TrainingNames;
  imageUrl: string;
  potChanges: number[];
  skillChanges: number[];
  xtra_01?: number;
  xtra_02?: number;
  requiredCardIds?: number[];
};
