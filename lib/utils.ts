export const getMarket = (id: number | null) =>
  ({ 0: "100%", 1: "25%", 2: "20%" })[id ?? -1] ?? "NULL";

export const getFoot = (id: number) =>
  ({ 0: "R", 1: "L" })[id] ?? "Unknown";

export const getPosition = (id: number) =>
  ({ 0: "GK", 1: "DF", 2: "MF", 3: "ST" })[id] ?? "Unknown";


const SKILL_VALUES = [0, 50, 150, 350, 600, 1000];
export const GRADES = ["E", "D", "C", "B", "A", "S"];


export function calculateAttributes(
  skills: Record<string, number>,
  mode: "levels" | "points" = "levels"
) {
  const s = (i: number) => {
    const key = `skill_${String(i).padStart(2, "0")}`;
    const value = Number(skills[key] ?? 0);

    if (mode === "points") {
      return Math.max(0, value);
    }

    return SKILL_VALUES[value] ?? 0;
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

export function formatPrice(price: number | null): string {
  if (price === null) return "Vorp?";

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


export type Language = "en" | "de" | "es" | "it" | "fr";

export const PLAYER_TYPE_NAMES = {
  en: [
    "Balanced",
    "Dynamo",
    "Worker",
    "Maverick",
    "Stopper",
    "Backup",
    "Marker",
    "Seeker",
    "Explorer",
    "Sprinter",
    "Creator",
    "Chancer",
  ],
  de: [
    "Allrounder",
    "Antreiber",
    "Arbeiter",
    "Solist",
    "Stopper",
    "Absicherer",
    "Bewacher",
    "Abfänger",
    "Zuspieler",
    "Sprinter",
    "Vorbereiter",
    "Schlitzohr",
  ],
  es: [
    "Completo",
    "Polivalente",
    "Entregado",
    "Explorador",
    "Destructor",
    "Centinela",
    "Sombra",
    "Recuperador",
    "Cerebro",
    "Relámpago",
    "Creativo",
    "Oportunista",
  ],
  it: [
    "Versatile",
    "Motorino",
    "Dinamico",
    "Incursore",
    "Marcatore",
    "Supporto",
    "Mastino",
    "Tenace",
    "Regista",
    "Scattante",
    "Creativo",
    "Bomber",
  ],
  fr: [
    "Équilibré",
    "Dynamique",
    "Travailleur",
    "Autonome",
    "Capteur",
    "Soutien",
    "Colleur",
    "Zonier",
    "Meneur",
    "Sprinteur",
    "Stratège",
    "Buteur",
  ],
} as const;

export function getSavedLanguage(): Language {
  if (typeof document === "undefined") return "en";

  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("npfc-language="));

  const value = entry?.split("=")[1];

  if (
    value === "en" ||
    value === "de" ||
    value === "es" ||
    value === "it" ||
    value === "fr"
  ) {
    return value;
  }

  return "en";
}


export const PLAYER_TYPE_COLORS = [
  "#ffc400",
  "#ff8700",
  "#fff4a3",
  "#fff100",
  "#ff3030",
  "#f020f5",
  "#ff9198",
  "#f7bcf4",
  "#05ed00",
  "#089cf4",
  "#ffffff",
  "#00c9ee",
] as const;

export function calculateWeeklyRecovery(skillPoints: number[]) {
  const stamina = Number(skillPoints[3] ?? 0);
  const toughness = Number(skillPoints[7] ?? 0);

  const weighted = Math.trunc(
    (stamina + toughness * 2) / 3
  );

  if (weighted < 50) return 70;
  if (weighted < 150) return 80;
  if (weighted < 350) return 92;
  if (weighted < 600) return 106;
  if (weighted < 1000) return 116;
  return 122;
}

export function getFatigueColor(
  fatigue: number | null
): "green" | "yellow" | "red" {
  if (fatigue === null) return "green";
  if (fatigue < 400) return "green";
  if (fatigue < 700) return "yellow";
  return "red";
}

export function getFatigueProgress(
  fatigue: number | null
) {
  if (fatigue === null) return 0;

  const value = Math.max(
    0,
    Math.min(1000, fatigue)
  );

  if (value < 400) {
    return (value / 400) * 100;
  }

  if (value < 700) {
    return ((value - 400) / 300) * 100;
  }

  return ((value - 700) / 300) * 100;
}


type SubSkillKey =
  | "skill_01"
  | "skill_02"
  | "skill_05"
  | "skill_06"
  | "skill_07";

type SubSkill = {
  key: SubSkillKey;
  label: string;
  icon: string;
};

const SUB_SKILLS = {
  shoot: [
    { key: "skill_01", label: "Shoot Accuracy", icon: "/shooting-accuracy.png" },
    { key: "skill_02", label: "Shoot Power", icon: "/shooting-power.png" },
  ],
  technic: [
    { key: "skill_05", label: "Dribbling", icon: "/dribbling.png" },
    { key: "skill_06", label: "Tackling", icon: "/tackling.png" },
    { key: "skill_07", label: "Ball Control", icon: "/ballcontrole.png" },
  ],
} as const satisfies Record<string, readonly SubSkill[]>;

export function getSubSkills(key: string): readonly SubSkill[] {
  if (key === "shoot" || key === "technic") {
    return SUB_SKILLS[key];
  }

  return [];
}

export function isPlayerDetailAvailable(playerId: number): boolean {
  return playerId < 792 || playerId > 1015;
}

export const STADIUMS = [
  { model: "ST_Fresh", name: "Beginner's Stadium" },
  { model: "ST_Stepa", name: "Advanced Stadium 1" },
  { model: "ST_Stepb", name: "Advanced Stadium 2" },
  { model: "ST_N2a", name: null },
  { model: "ST_N2b", name: null },
  { model: "ST_N2c", name: null },
  { model: "ST_N2d", name: null },
  { model: "ST_N2e", name: null },
  { model: "ST_N2f", name: null },
  { model: "ST_N2g", name: null },
  { model: "ST_N2h", name: null },
  { model: "ST_N1a", name: null },
  { model: "ST_N1b", name: null },
  { model: "ST_N1c", name: null },
  { model: "ST_N1d", name: "Black & Yellow Stadium" },
  { model: "ST_N1e", name: null },
  { model: "ST_N1f", name: null },
  { model: "ST_N1g", name: null },
  { model: "ST_N1h", name: null },
  { model: "ST_N1i", name: null },
  { model: "ST_N1j", name: null },
  { model: "ST_N1k", name: null },
  { model: "ST_N1l", name: null },
  { model: "ST_NZAsia", name: "Europe Cup Stadium" },
  { model: "ST_NZEuro", name: "World Cup Stadium" },
  { model: "ST_Testmatch", name: "Test Match Stadium" },
  { model: "ST_Home1", name: "Home Stadium 1" },
  { model: "ST_Home2", name: "Home Stadium 2" },
  { model: "ST_Home3", name: "Home Stadium 3" },
  { model: "ST_JC", name: null },
] as const;

export type FieldImage =
  | "empty"
  | "dirty"
  | "horizont"
  | "vertical"
  | "cross"
  | "diagonal"
  | "circle"
;

export const STADIUM_FIELD_IMAGES: Record<number, FieldImage> = {
  0: "dirty",
  1: "empty",
  2: "empty",
  3: "horizont",
  4: "vertical",
  5: "vertical",
  6: "vertical",
  7: "empty",
  8: "empty",
  9: "horizont",
  10: "horizont",
  11: "horizont",
  12: "vertical",
  13: "horizont",
  14: "empty",
  15: "cross",
  16: "vertical",
  17: "horizont",
  18: "vertical",
  19: "cross",
  20: "horizont",
  21: "vertical",
  22: "vertical",
  23: "diagonal",
  24: "circle",
  25: "empty",
  26: "empty",
  27: "horizont",
  28: "cross",
  29: "horizont",
};

export function getFieldImage(stadiumId: number | null): FieldImage {
  return stadiumId === null ? "empty" : STADIUM_FIELD_IMAGES[stadiumId] ?? "empty";
}

