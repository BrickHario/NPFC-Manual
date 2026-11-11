import { calculateTrainingStep } from "../training-planner/player-type-calculation";
import type { TrainingCard, TrainingCombo } from "./types";

type TypeVector = { dx: number; dy: number };

const BASE_POTS = Array<number>(12).fill(50);
const TAU = Math.PI * 2;

export function getTypeVector(data: TrainingCard | TrainingCombo): TypeVector {
  const fields = data as unknown as Record<string, unknown>;
  const changes = Array.from({ length: 12 }, (_, index) =>
    Number(fields[`pot_${String(index + 1).padStart(2, "0")}`] ?? 0)
  );
  const result = calculateTrainingStep(BASE_POTS, changes);
  return { dx: result.dx, dy: result.dy };
}

export function getClockwiseAngle(vector: TypeVector, start = 0): number {
  if (vector.dx === 0 && vector.dy === 0) return Infinity;
  const angle = (Math.atan2(vector.dx, vector.dy) + TAU) % TAU;
  return (angle - start + TAU) % TAU;
}

export function formatTypeVector(dx: number, dy: number): string {
  const signed = (value: number) => value > 0 ? `+${value}` : String(value);
  return `X ${signed(dx)} / Y ${signed(dy)}`;
}
