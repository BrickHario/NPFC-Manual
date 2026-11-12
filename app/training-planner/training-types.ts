
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
  gkOnly?: boolean;
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

export function calculateTrainingFatigue(cards: { skillPoints: number[] }[]): number {
  const sum = cards.reduce((total, card) =>
    total + card.skillPoints.slice(0, 9).reduce((a, b) => a + b, 0), 0);
  if (cards.length === 1) return Math.max(0, Math.trunc(sum * 10));
  if (cards.length === 2) return Math.max(0, Math.trunc(sum * 20 / 3));
  if (cards.length === 3) return Math.max(0, Math.trunc(sum * 5));
  return 0;
}

export function getGroupedTrainingFatigue(entries: TrainingEntry[]): number {
  if (entries.length === 1 && entries[0].kind === "combo") {
    return entries[0].fatigueChange;
  }
  return calculateTrainingFatigue(entries.map((entry) => ({ skillPoints: entry.skillChanges })));
}

export function canUseTraining(entry: TrainingEntry, isGoalkeeper: boolean): boolean {
  return entry.kind !== "combo" || !entry.gkOnly || isGoalkeeper;
}

export function resolveTrainingSelection(
  selected: SelectedTraining[],
  catalog: ReadonlyMap<string, TrainingEntry>,
  isGoalkeeper: boolean
): SelectedTraining[] {
  let nextInstanceId = Math.max(-1, ...selected.map((item) => item.instanceId)) + 1;
  let nextGroupId = Math.max(-1, ...selected.map((item) => item.groupId ?? -1)) + 1;

  return selected.flatMap((item) => {
    const entry = catalog.get(`${item.kind}:${item.id}`);
    if (!entry || canUseTraining(entry, isGoalkeeper)) return [item];

    const ids = entry.requiredCardIds ?? [];
    if (ids.length < 2 || ids.length > 3 || new Set(ids).size !== ids.length ||
        !ids.every((id) => catalog.has(`card:${id}`))) return [];

    const groupId = nextGroupId++;
    return ids.map((id, index) => ({
      kind: "card" as const,
      id,
      instanceId: index === 0 ? item.instanceId : nextInstanceId++,
      groupId,
    }));
  });
}
