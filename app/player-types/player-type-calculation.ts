
export const POT_WEIGHTS = [
  [-1, 0, 4, 0],
  [-1, 0, -3, 0],
  [-1, 0, -1, -1],
  [-1, 0, 1, 1],
  [-1, 0, 1, -1],
  [1, -2, 0, 0],
  [1, -3, 0, 0],
  [1, 2, 0, 0],
  [1, 0, 0, -2],
  [1, 0, 0, 1],
  [1, 2, 0, 0],
  [1, 3, 0, 0],
] as const;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function calculateWeightedValue(
  pots: number[],
  column: number,
  scale: number
) {
  let positiveWeight = 0;
  let negativeWeight = 0;
  let positiveSum = 0;
  let negativeSum = 0;

  for (let i = 0; i < 12; i++) {
    const weight = POT_WEIGHTS[i][column];
    const value = clamp(Math.trunc(pots[i] ?? 0), 0, 100);

    if (weight > 0) {
      positiveWeight += weight;
      positiveSum += value * weight;
    } else if (weight < 0) {
      negativeWeight += -weight;
      negativeSum += value * -weight;
    }
  }

  const positive = positiveWeight
    ? Math.trunc(
        (positiveSum * scale) / (positiveWeight * 100)
      )
    : 0;

  const negative = negativeWeight
    ? Math.trunc(
        (negativeSum * scale) / (negativeWeight * 100)
      )
    : 0;

  return clamp(positive - negative, -50, 50);
}

export function calculatePlayerPosition(pots: number[]) {
  if (pots.length !== 12) {
    throw new Error("Exactly 12 potential values are required");
  }

  const xOffset = calculateWeightedValue(pots, 0, 240);

  const yOffset1 = calculateWeightedValue(
    pots,
    1,
    Math.max(0, 30 + xOffset)
  );

  const yOffset2 = calculateWeightedValue(
    pots,
    2,
    Math.max(0, 30 - xOffset)
  );

  const yOffset3 = calculateWeightedValue(pots, 3, 50);

  return {
    x: 50 + xOffset,
    y: clamp(
      50 + yOffset1 + yOffset2 + yOffset3,
      0,
      100
    ),
  };
}

export function applyTrainingPots(
  initialPots: number[],
  trainingChanges: number[][]
) {
  const result = [...initialPots];

  for (const changes of trainingChanges) {
    for (let i = 0; i < 12; i++) {
      result[i] = clamp(
        result[i] + (changes[i] ?? 0),
        0,
        255
      );
    }
  }

  return result;
}

export function calculateTrainingStep(
  pots: number[],
  potChanges: number[]
) {
  const start = calculatePlayerPosition(pots);
  const nextPots = applyTrainingPots(pots, [potChanges]);
  const position = calculatePlayerPosition(nextPots);

  return {
    nextPots,
    position,
    dx: position.x - start.x,
    dy: position.y - start.y,
  };
}
