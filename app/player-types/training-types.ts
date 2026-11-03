
export type TrainingKind = "card" | "combo";

export type TrainingNames = {
  en: string;
  de: string;
  es: string;
  it: string;
  fr: string;
};

export type TrainingEntry = {
  kind: TrainingKind;
  id: number;
  names: TrainingNames;
  imageUrl: string;
};
