export type TeamPlayerPosition = "GK" | "DEF" | "MID" | "FWD";

export function getTeamPlayerSkills(
  baseSkills: number[],
  teamBonuses: number[],
  position: TeamPlayerPosition,
) {
  const groups = [
    [0, 1],
    [2],
    [3],
    [4, 5, 6],
    [7],
    [8],
    [9],
  ];

  const bonuses = Array<number>(10).fill(0);

  groups.forEach((group, i) => {
    const boost = Math.trunc(
      (Math.trunc(teamBonuses[i] * 12 / group.length) + 50) / 100,
    );

    group.forEach((index) => {
      bonuses[index] += boost;
    });
  });

  const minimum = Array<number>(10).fill(1);

  if (position === "GK") {
    minimum[8] = 2;
  }

  if (position === "FWD") {
    minimum[1] = 2;
    minimum[6] = 2;
  }

  const required = minimum.map((value, i) => value - baseSkills[i]);

  const demand = required.reduce(
    (sum, value, i) => sum + Math.max(0, value - bonuses[i] + 1),
    0,
  );

  const order = Array.from({ length: 10 }, (_, i) => i).sort(
    (a, b) => (bonuses[a] - required[a]) - (bonuses[b] - required[b]),
  );

  let pool = 0;

  for (const i of order) {
    if (pool >= demand) break;

    if (bonuses[i] - required[i] > 1) {
      const amount = Math.min(
        demand - pool,
        Math.max(1, baseSkills[i] + bonuses[i] - 4),
      );

      bonuses[i] -= amount;
      pool += amount;
    }
  }

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < 10; i++) {
      if (pool <= 0) break;

      if (bonuses[i] < required[i] + pass) {
        bonuses[i]++;
        pool--;
      }
    }
  }

  return baseSkills.map((skill, i) =>
    Math.max(0, Math.min(5, skill + bonuses[i])),
  );
}
