import {
  parseSave,
  type ImportedSavePlayer,
} from "@/app/training-planner/save-parser";

import { opponentTypeRows, playerFootBits } from "./saved-player-metadata";
import {
  readPlayerAvailability,
  type PlayerAvailability,
} from "./player-availability";

export {
  readPlayerAvailability,
  type PlayerAvailability,
} from "./player-availability";

export type SavedOpponentPlayer = {
  id: number;
  availability: PlayerAvailability | null;
  rosterSlot: number;
  fatigue: number;
  skills: number[];
  shirtNumber: number | null;
  typeIndex: number | null;
  foot: "L" | "R" | null;
};

export type SavedPlayerExperience = {
  playerId: number;
  matchesPlayed: number;
  actionXP: {
    shooting: number;
    longPassing: number;
    throughPassing: number;
    dribbling: number;
    directPassing: number;
  };
  positionXP: {
    gk: number;
    df: number;
    mf: number;
    fw: number;
  };
  actionGrades: {
    shooting: string;
    longPassing: string;
    throughPassing: string;
    dribbling: string;
    directPassing: string;
  };
  positionGrades: {
    gk: string;
    df: string;
    mf: string;
    fw: string;
  };
};

export type SavedOwnPlayer = ImportedSavePlayer & {
  lineupRank: number | null;
  availability: PlayerAvailability | null;
  shirtNumber: number | null;
  experience: SavedPlayerExperience | null;
};

export type SavedLineupSlot = {
  lineupSlot: number;
  rosterSlot: number;
  primaryRank: number;
  playerId: number;
};

export type SavedOpponentLineup = {
  predictionSource: "saved-revised-order" | "revised-with-primary-fallback";
  starters: SavedLineupSlot[];
  bench: SavedLineupSlot[];
  positionExperienceDisabled: boolean;
  experienceOverride: { position: number; actions: number[] } | null;
  primaryOrder: number[];
  formationRoleCodes: number[];
};

export type ImportedTeam = {
  name: string;
  abbreviation: string;
  fileName: string;
  counter: number;
  players: SavedOwnPlayer[];
  opponents: Record<number, SavedOpponentPlayer[]>;
  opponentLineups: Record<number, SavedOpponentLineup>;
};

const SAVE_SIZE = 76120;
const MAGIC = "CALCIO3DS";

const TEAM_ABBREVIATION_OFFSET = 0x860;
const TEAM_ABBREVIATION_LENGTH = 0x0a;
const TEAM_NAME_OFFSET = 0x86a;
const TEAM_NAME_LENGTH = 0x30;

const SAVE_ROSTER_OFFSET = 0x0c6e;
const PLAYER_SIZE = 0x98;
const EMPTY_PLAYER_ID = 1016;

const STORAGE_KEY = "npfc-imported-team-v10";

function experienceGrade(points: number): string {
  if (points >= 1000) return "S";
  if (points >= 600) return "A";
  if (points >= 350) return "B";
  if (points >= 150) return "C";
  if (points >= 50) return "D";
  return "E";
}

function readPlayerExperience(
  view: DataView,
  slotIndex: number,
): SavedPlayerExperience | null {
  const base = SAVE_ROSTER_OFFSET + slotIndex * PLAYER_SIZE;

  const read = (offset: number) => view.getUint16(base + offset, true);

  const playerId = read(0x00);

  if (playerId >= EMPTY_PLAYER_ID) return null;

  const actionXP = {
    shooting: read(0x56),
    longPassing: read(0x58),
    throughPassing: read(0x5a),
    dribbling: read(0x5c),
    directPassing: read(0x5e),
  };

  const positionXP = {
    gk: read(0x60),
    df: read(0x62),
    mf: read(0x64),
    fw: read(0x66),
  };

  return {
    playerId,
    matchesPlayed: read(0x90),
    actionXP,
    positionXP,
    actionGrades: {
      shooting: experienceGrade(actionXP.shooting),
      longPassing: experienceGrade(actionXP.longPassing),
      throughPassing: experienceGrade(actionXP.throughPassing),
      dribbling: experienceGrade(actionXP.dribbling),
      directPassing: experienceGrade(actionXP.directPassing),
    },
    positionGrades: {
      gk: experienceGrade(positionXP.gk),
      df: experienceGrade(positionXP.df),
      mf: experienceGrade(positionXP.mf),
      fw: experienceGrade(positionXP.fw),
    },
  };
}

function readShirtNumber(bytes: Uint8Array, id: number): number | null {
  const offset = 0x9710 + id * 0x24;

  if (offset >= bytes.length) return null;

  const number = (bytes[offset] & 0xfe) >>> 1;

  return number > 0 && number <= 99 ? number : null;
}

function readOpponentType(
  bytes: Uint8Array,
  teamId: number,
  slot: number,
): number | null {
  const start = 0x2573 + teamId * 0x260;
  const found = bytes.subarray(start, start + 24).indexOf(slot);
  const index = found === -1 ? 24 : found;

  const override = teamId >= 11 && teamId < 31 ? bytes[0x12768 + teamId] : 0;

  const value =
    override && index < 11
      ? bytes[0x92b8 + (override & 0x7f) * 0x58 + index * 8]
      : opponentTypeRows[teamId]?.[index];

  return Number.isInteger(value) && value >= 0 && value < 12 ? value : null;
}

export function readOpponentLineup(
  view: DataView,
  teamId: number,
): SavedOpponentLineup {
  const base = teamId * 0x260;
  const primary = Array.from({ length: 25 }, (_, i) =>
    view.getUint8(base + 0x2573 + i),
  );
  const revised = Array.from({ length: 18 }, (_, i) =>
    view.getUint8(base + 0x258c + i),
  );
  const playerIdAt = (slot: number) =>
    view.getUint16(base + 0x2632 + slot * 2, true);
  const uniqueValid = (slots: number[]) => {
    const seen = new Set<number>();
    return slots.filter((slot) => {
      if (
        slot < 0 ||
        slot >= 25 ||
        playerIdAt(slot) >= EMPTY_PLAYER_ID ||
        seen.has(slot)
      ) {
        return false;
      }
      seen.add(slot);
      return true;
    });
  };
  const revisedSlots = uniqueValid(revised);
  const orderedSlots = uniqueValid([...revisedSlots, ...uniqueValid(primary)]);

  const toLineupSlot = (
    rosterSlot: number,
    lineupSlot: number,
  ): SavedLineupSlot => ({
    playerId: playerIdAt(rosterSlot),
    rosterSlot,
    lineupSlot,
    primaryRank: primary.indexOf(rosterSlot),
  });
  const override =
    teamId >= 11 && teamId < 31 ? view.getUint8(0x12768 + teamId) : 0;
  const overrideBase = 0x8c88 + (override & 0x7f) * 0x84;
  const experienceOverride =
    override && overrideBase + 0x7a <= view.byteLength
      ? {
          position: view.getUint8(overrideBase + 0x74),
          actions: Array.from({ length: 5 }, (_, i) =>
            view.getUint8(overrideBase + 0x75 + i),
          ),
        }
      : null;

  return {
    bench: orderedSlots
      .slice(11, 18)
      .map((slot, index) => toLineupSlot(slot, index + 11)),
    positionExperienceDisabled: view.getUint8(base + 0x2570) === 0,
    experienceOverride,
    predictionSource:
      revisedSlots.length >= 11
        ? "saved-revised-order"
        : "revised-with-primary-fallback",
    primaryOrder: primary,
    formationRoleCodes: Array.from({ length: 18 }, (_, i) =>
      view.getUint8(base + 0x259e + i),
    ),
    starters: orderedSlots.slice(0, 11).map(toLineupSlot),
  };
}

function readText(bytes: Uint8Array, offset: number, length: number) {
  const region = bytes.subarray(offset, offset + length);
  const end = region.indexOf(0);

  if (end < 0) {
    throw new Error("Invalid team text: missing null terminator");
  }

  return new TextDecoder("utf-8", { fatal: true })
    .decode(region.subarray(0, end))
    .trim();
}

export function parseTeamSave(
  buffer: ArrayBuffer,
  fileName: string,
): ImportedTeam {
  if (buffer.byteLength !== SAVE_SIZE) {
    throw new Error(
      `${fileName}: Invalid file size (${buffer.byteLength} bytes)`,
    );
  }

  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  const signature = new TextDecoder("ascii").decode(
    bytes.subarray(0x08, 0x08 + MAGIC.length),
  );

  if (signature !== MAGIC) {
    throw new Error(`${fileName}: Invalid save signature`);
  }

  const calendar = view.getUint16(0x18, true);

  if (calendar >>> 10 > 47) {
    throw new Error(`${fileName}: Invalid calendar week`);
  }

  let name: string;
  let abbreviation: string;

  try {
    name = readText(bytes, TEAM_NAME_OFFSET, TEAM_NAME_LENGTH);
    abbreviation = readText(
      bytes,
      TEAM_ABBREVIATION_OFFSET,
      TEAM_ABBREVIATION_LENGTH,
    );
  } catch {
    throw new Error(`${fileName}: Could not read team name or abbreviation`);
  }

  if (!name || !abbreviation) {
    throw new Error(`${fileName}: Team name or abbreviation is missing`);
  }

  const baseSave = parseSave(buffer, fileName);

  const slotById = new Map<number, number>();
  for (let slot = 0; slot < 25; slot++) {
    const base = SAVE_ROSTER_OFFSET + slot * PLAYER_SIZE;
    const playerId = view.getUint16(base + 0x00, true);
    if (playerId > 0 && playerId < EMPTY_PLAYER_ID) {
      slotById.set(playerId, slot);
    }
  }

  const ownOrder = Array.from(bytes.subarray(0x89c, 0x89c + 25));
  const validOwnOrder =
    ownOrder.length === 25 &&
    new Set(ownOrder).size === 25 &&
    ownOrder.every((slot) => slot < 25);

  const opponents: Record<number, SavedOpponentPlayer[]> = {};
  const opponentLineups: Record<number, SavedOpponentLineup> = {};

  for (let teamId = 0; teamId < 44; teamId++) {
    const roster: SavedOpponentPlayer[] = [];
    const seen = new Set<number>();

    for (let slot = 0; slot < 25; slot++) {
      const id = view.getUint16(0x2632 + teamId * 0x260 + slot * 2, true);

      if (id >= EMPTY_PLAYER_ID || seen.has(id)) continue;

      const offset = 0x25b0 + teamId * 0x260 + slot * 5;

      const skills = Array.from(
        { length: 10 },
        (_, i) => (bytes[offset + (i >> 1)] >> ((i & 1) * 4)) & 15,
      );

      seen.add(id);

      roster.push({
        id,
        rosterSlot: slot,
        availability: readPlayerAvailability(view, id),
        fatigue: Math.max(0, view.getInt16(0x9716 + id * 0x24, true)),
        skills,
        shirtNumber: readShirtNumber(bytes, id),
        typeIndex: readOpponentType(bytes, teamId, slot),
        foot:
          playerFootBits[id] === "1"
            ? "L"
            : playerFootBits[id] === "0"
            ? "R"
            : null,
      });
    }

    opponents[teamId] = roster;
    opponentLineups[teamId] = readOpponentLineup(view, teamId);
  }

  return {
    name,
    abbreviation,
    fileName,
    counter: view.getUint32(0x04, true),
    opponents,
    opponentLineups,
    players: baseSave.players.map((player) => {
      const slotIndex = slotById.get(player.id);
      return {
        ...player,
        lineupRank:
          slotIndex === undefined || !validOwnOrder
            ? null
            : ownOrder.indexOf(slotIndex),
        availability: readPlayerAvailability(view, player.id),
        foot:
          playerFootBits[player.id] === "1"
            ? "L"
            : playerFootBits[player.id] === "0"
            ? "R"
            : player.foot,
        shirtNumber: readShirtNumber(bytes, player.id),
        experience:
          slotIndex === undefined
            ? null
            : readPlayerExperience(view, slotIndex),
      };
    }),
  };
}

export async function parseTeamSaveFiles(files: File[]): Promise<ImportedTeam> {
  if (files.length === 0 || files.length > 3) {
    throw new Error(
      "Select savedata0.bin, savedata1.bin, savedata2.bin or all three",
    );
  }

  const saves: ImportedTeam[] = [];
  const errors: string[] = [];
  const names = new Set<string>();

  for (const file of files) {
    const match = file.name
      .toLowerCase()
      .match(/^(savedata[012])(?:\s*\(\d+\))?\.bin$/);

    if (!match) {
      errors.push(`Unsupported file: ${file.name}`);
      continue;
    }

    if (names.has(match[1])) {
      errors.push(`Duplicate file: ${match[1]}.bin`);
      continue;
    }

    names.add(match[1]);

    try {
      saves.push(parseTeamSave(await file.arrayBuffer(), file.name));
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : `Unable to read ${file.name}`,
      );
    }
  }

  if (saves.length === 0) {
    throw new Error(errors.join("\n") || "No valid NPFC save found");
  }

  saves.sort((a, b) => b.counter - a.counter);

  return saves[0];
}

export function readImportedTeam(): ImportedTeam | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const value: unknown = JSON.parse(raw);

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const team = value as Partial<ImportedTeam>;

    if (
      typeof team.name !== "string" ||
      typeof team.abbreviation !== "string" ||
      typeof team.fileName !== "string" ||
      typeof team.counter !== "number" ||
      !Array.isArray(team.players) ||
      typeof team.opponents !== "object" ||
      team.opponents === null ||
      typeof team.opponentLineups !== "object" ||
      team.opponentLineups === null
    ) {
      return null;
    }

    return team as ImportedTeam;
  } catch {
    return null;
  }
}

export function saveImportedTeam(team: ImportedTeam) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
}

export function removeImportedTeam() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("npfc-imported-team-v1");
  localStorage.removeItem("npfc-imported-team-v2");
  localStorage.removeItem("npfc-imported-team-v3");
  localStorage.removeItem("npfc-imported-team-v4");
  localStorage.removeItem("npfc-imported-team-v5");
  localStorage.removeItem("npfc-imported-team-v6");
  localStorage.removeItem("npfc-imported-team-v7");
  localStorage.removeItem("npfc-imported-team-v8");
  localStorage.removeItem("npfc-imported-team-v9");
}
