export type TeamFormationSlot = {
  slot_id: number;
  fieldX: number;
  fieldY: number;
  tacticalLine: number;
};

export type FormationNameMode = "standard" | "detailed" | "compact";

export function decodeFormation(hex: string): TeamFormationSlot[] {
  if (!/^[0-9a-f]{32}$/i.test(hex)) {
    throw new Error("Invalid formation hex");
  }

  const bytes = Uint8Array.from(
    hex.match(/../g)!.map((value) => parseInt(value, 16)),
  );

  const lineCounts = [
    bytes[0] & 0x0f,
    bytes[0] >> 4,
    bytes[1] & 0x0f,
    bytes[1] >> 4,
  ];

  if (lineCounts.reduce((sum, count) => sum + count, 0) !== 10) {
    throw new Error("Invalid formation line counts");
  }

  const tacticalLines = lineCounts.flatMap((count, line) =>
    Array<number>(count).fill(line),
  );

  const view = new DataView(bytes.buffer);
  const slots: TeamFormationSlot[] = [
    { slot_id: 0, fieldX: 8, fieldY: 1, tacticalLine: -1 },
  ];

  for (let i = 0; i < 10; i++) {
    const group = Math.floor(i / 3);
    const part = i % 3;
    const offset = 2 + group * 4;

    let fieldX: number;
    let fieldY: number;

    if (part < 2) {
      const word = view.getUint16(offset + part * 2, true);
      fieldX = (word >> 10) & 31;
      fieldY = (word >> 5) & 31;
    } else {
      fieldX = bytes[offset] & 31;
      fieldY = bytes[offset + 2] & 31;
    }

    slots.push({
      slot_id: i + 1,
      fieldX,
      fieldY,
      tacticalLine: tacticalLines[i],
    });
  }

  return slots;
}

export function getFormationName(
  slots: TeamFormationSlot[],
  mode: FormationNameMode = "standard",
): string {
  const lines = [0, 0, 0, 0];

  for (const slot of slots) {
    if (slot.slot_id === 0) continue;

    if (slot.tacticalLine < 0 || slot.tacticalLine > 3) {
      throw new Error("Invalid tactical line");
    }

    lines[slot.tacticalLine]++;
  }

  if (lines.reduce((sum, count) => sum + count, 0) !== 10) {
    throw new Error("Incomplete formation");
  }

  const counts =
    mode === "compact" || (mode === "standard" && lines[3] >= 2)
      ? [lines[0], lines[1] + lines[2], lines[3]]
      : lines;

  return counts.filter((count) => count > 0).join("-");
}
