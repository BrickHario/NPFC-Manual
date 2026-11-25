export type TeamExperienceGrades = {
  position: number | null;
  actions: (number | null)[];
};

export type TeamStatsPlayer = {
  id: number;
  positionId: number | null;
  selection: "lineup" | "sub" | "reserve" | null;
  skillScores: (number | null)[];
  positionScores: (number | null)[];
  actionScores: (number | null)[];
  movement: [number, number] | null;
};

export const STAT_GRADES = ["E", "D", "C", "B", "A", "S"] as const;
export const STAT_THRESHOLDS = [0, 50, 150, 350, 600, 1000, 1100] as const;

export function gradeScore(level: number | null | undefined): number | null {
  if (typeof level !== "number" || !Number.isInteger(level) || level < 0 || level > 5) return null;
  return level * 100 / 6;
}

export function xpScore(points: number | null | undefined): number | null {
  if (typeof points !== "number" || !Number.isFinite(points) || points < 0) return null;
  const value = Math.min(points, STAT_THRESHOLDS[6]);
  const level = STAT_THRESHOLDS.slice(0, 6).reduce<number>(
    (current, threshold, index) => value >= threshold ? index : current, 0,
  );
  const fraction = (value - STAT_THRESHOLDS[level]) / (STAT_THRESHOLDS[level + 1] - STAT_THRESHOLDS[level]);
  return (level + fraction) * 100 / 6;
}

export function scoreGrade(score: number) {
  return STAT_GRADES[Math.min(5, Math.max(0, Math.floor(score * 6 / 100 + 1e-9)))];
}

export function averageStat(values: (number | null | undefined)[]) {
  const known = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return {
    value: known.length ? known.reduce((sum, value) => sum + value, 0) / known.length : null,
    count: known.length,
  };
}
