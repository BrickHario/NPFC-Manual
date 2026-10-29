export const getMarket = (id: number | null) =>
  ({ 0: "100%", 1: "25%", 2: "20%" })[id ?? -1] ?? "NULL";

export const getFoot = (id: number) =>
  ({ 0: "R", 1: "L" })[id] ?? "Unknown";

export const getPosition = (id: number) =>
  ({ 0: "GK", 1: "DF", 2: "MF", 3: "ST" })[id] ?? "Unknown";


const SKILL_VALUES = [0, 50, 150, 350, 600, 1000];
const GRADES = ["E", "D", "C", "B", "A", "S"];

export function calculateAttributes(skills: Record<string, number>) {
  const s = (i: number) => {
    const key = `skill_${String(i).padStart(2, "0")}`;
    return SKILL_VALUES[skills[key]] ?? 0;
  };

  const attributes = {
    Shoot: (s(1) + s(2)) / 2,
    Speed: s(3),
    Stamina: s(4),
    Technic: (s(5) + s(6) + s(7)) / 3,
    Strength: s(8),
    Jump: s(9),
    Will: s(10),
  };

  const getLevel = (value: number) => {
    if (value >= 1000) return 5;
    if (value >= 600) return 4;
    if (value >= 350) return 3;
    if (value >= 150) return 2;
    if (value >= 50) return 1;
    return 0;
  };

  return Object.entries(attributes).map(([name, value]) => ({
    name,
    value,
    level: getLevel(value),
    grade: GRADES[getLevel(value)],
  }));
}


export function getOverall(skills: Record<string, number>): number {
  const total = Array.from({ length: 10 }, (_, i) => {
    const key = `skill_${String(i + 1).padStart(2, "0")}`;
    return Math.max(0, Math.min(5, Number(skills[key] ?? 0)));
  }).reduce((sum, value) => sum + value, 0);

  // Bisherige Berechnung
  let old: number;

  if (total <= 1) {
    old = total;
  } else if (total <= 45) {
    old = Math.round(1 + (total - 1) * 98 / 44);
  } else {
    old = Math.round(99 + (total - 45) / 5);
  }

  // Neue Verteilung (1 bis 99)
  old = Math.max(1, Math.min(99, old));

  if (old <= 30) return old;

  if (old <= 54)
    return Math.round(30 + (old - 30) * 30 / 24);

  if (old <= 81)
    return Math.round(60 + (old - 54) * 30 / 27);

  return Math.round(90 + (old - 81) * 9 / 18);
}

export function getTier(overall: number) {
  if (overall <= 27) return "bronze";
  if (overall <= 49) return "silber";
  if (overall <= 81) return "gold";
  return "ultra";
}

export function getPositionGradient(position: string): string {
  const gradients: Record<string, string> = {
    GK: "linear-gradient(180deg, #9955dd, #cba8ee)",
    DF: "linear-gradient(180deg, #dd555c, #eea8ac)",
    MF: "linear-gradient(180deg, #f3c40a, #f9e182)",
    ST: "linear-gradient(180deg, #5581dd, #a8bfee)",
  };

  return gradients[position] ?? gradients.ST;
}

export const MARKET_LABELS: Record<string, string> = {
  "100%": "Regular",
  "25%": "Common",
  "20%": "Rare",
};

export function formatPrice(price: number): string {
  if (Math.abs(price) >= 1000) {
    return `${new Intl.NumberFormat("de-DE", {
      maximumFractionDigits: 1,
    }).format(price / 1000)}k`;
  }
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0,
  }).format(price);
}

export const attributeImages = [
  "/shoot-icon.png",
  "/run-icon.png",
  "/stamina-icon.png",
  "/technic-icon.png",
  "/strenght-icon.png",
  "/jump-icon.png",
  "/will-icon.png",
] as const;

export const rankImages: Record<string, string> = {
  S: "/S-icon.png",
  A: "/A-icon.png",
  B: "/B-icon.png",
  C: "/C-icon.png",
  D: "/D-icon.png",
  E: "/E-icon.png",
};

export function getAttributeImage(name: string, index: number): string {
  const value = name.toLowerCase().trim();
  if (/shoot|shot|schuss/.test(value)) return "/shoot-icon.png";
  if (/speed|tempo|pace/.test(value)) return "/run-icon.png";
  if (/stamina|ausdauer|endurance/.test(value)) return "/stamina-icon.png";
  if (/technic|techni|technik|skill/.test(value)) return "/technic-icon.png";
  if (/strength|kraft|power/.test(value)) return "/strenght-icon.png";
  if (/jump|sprung/.test(value)) return "/jump-icon.png";
  if (/will|wille|mental/.test(value)) return "/will-icon.png";
  return attributeImages[index] ?? "/will-icon.png";
}

export function getMarketColor(market: string): string {
  const colors: Record<string, string> = {
    "100%": "var(--color-tactical)",
    "25%": "var(--color-highlight)",
    "20%": "#cc8925",
  };

  return colors[market.replace(/\s+/g, "")] ?? "var(--button_grey)";
}

export const POTENTIAL_CURVE_ORDER = {
  prepared: ["00", "01", "02", "03", "11", "12", "13", "14", "22", "23", "24"],
  development: ["55", "54", "45", "44", "43", "34", "33", "32"],
  best: ["14", "24", "34", "55", "45", "03", "13", "23", "33", "54", "44", "02", "12", "22", "32", "43", "01", "11", "00"],
} as const;
