export type PlayerAvailability = {
  available: boolean;
  injured: boolean;
  injuryWeeks: number;
  injuryCategory: number;
  suspended: boolean;
  suspensionReason: "red-card" | "yellow-cards" | null;
  suspensionMatches: number;
  yellowCards: number;
};

export function readPlayerAvailability(
  view: DataView,
  playerId: number,
): PlayerAvailability | null {
  if (!Number.isInteger(playerId) || playerId < 0 || playerId >= 1016) {
    return null;
  }

  const base = 0x9710 + playerId * 0x24;
  if (base + 0x0e > view.byteLength) return null;

  const injuryByte = view.getUint8(base + 0x05);
  const injuryCategory = injuryByte >>> 4;
  const injuryWeeks = injuryByte & 0x0f;
  const injured = injuryCategory > 0;
  const cardRaw = view.getUint16(base + 0x0c, true);
  const cardStatus = (cardRaw >>> 6) & 0x0f;
  const suspended = cardStatus >= 3;

  return {
    available: !injured && !suspended,
    injured,
    injuryWeeks,
    injuryCategory,
    suspended,
    suspensionReason: !suspended ? null : cardStatus >= 10 ? "red-card" : "yellow-cards",
    suspensionMatches: suspended ? 1 : 0,
    yellowCards: cardStatus <= 3 ? cardStatus : 0,
  };
}

export function isUnavailable(availability?: PlayerAvailability | null): boolean {
  return availability?.available === false;
}

export function getAvailabilityLabel(availability?: PlayerAvailability | null): string {
  if (!availability) return "Availability unknown";
  const reasons: string[] = [];
  if (availability.injured) {
    const weeks = availability.injuryWeeks;
    reasons.push(`Injured (${weeks} ${weeks === 1 ? "week" : "weeks"})`);
  }
  if (availability.suspended) {
    reasons.push(availability.suspensionReason === "red-card"
      ? "Red card suspension"
      : availability.suspensionReason === "yellow-cards"
        ? "Yellow card suspension"
        : "Suspended");
  }
  return reasons.length ? reasons.join(" · ") : "Available";
}
