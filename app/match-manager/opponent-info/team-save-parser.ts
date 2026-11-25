import {
  parseSave,
  type ImportedSavePlayer,
} from "@/app/training-planner/save-parser";

export type SavedOpponentPlayer = { id: number; skills: number[] };

export type ImportedTeam = {
  name: string;
  abbreviation: string;
  fileName: string;
  counter: number;
  players: ImportedSavePlayer[];
  opponents: Record<number, SavedOpponentPlayer[]>;
};

const SAVE_SIZE = 76120;
const MAGIC = "CALCIO3DS";
const TEAM_ABBREVIATION_OFFSET = 0x860;
const TEAM_ABBREVIATION_LENGTH = 0x0a;
const TEAM_NAME_OFFSET = 0x86a;
const TEAM_NAME_LENGTH = 0x30;
const STORAGE_KEY = "npfc-imported-team-v3";

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

  const opponents: Record<number, SavedOpponentPlayer[]> = {};
  for (let teamId = 0; teamId < 44; teamId++) {
    const roster: SavedOpponentPlayer[] = [];
    const seen = new Set<number>();
    for (let slot = 0; slot < 25; slot++) {
      const id = view.getUint16(0x2632 + teamId * 0x260 + slot * 2, true);
      if (id >= 1016 || seen.has(id)) continue;
      const offset = 0x25b0 + teamId * 0x260 + slot * 5;
      const skills = Array.from(
        { length: 10 },
        (_, i) => (bytes[offset + (i >> 1)] >> ((i & 1) * 4)) & 15,
      );
      seen.add(id);
      roster.push({ id, skills });
    }
    opponents[teamId] = roster;
  }

  return {
    opponents,
    name,
    abbreviation,
    fileName,
    counter: view.getUint32(0x04, true),
    players: parseSave(buffer, fileName).players,
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
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    );

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const team = value as Partial<ImportedTeam>;

    if (
      typeof team.name !== "string" ||
      !team.name.trim() ||
      team.name.length > TEAM_NAME_LENGTH ||
      typeof team.abbreviation !== "string" ||
      !team.abbreviation.trim() ||
      team.abbreviation.length > TEAM_ABBREVIATION_LENGTH ||
      typeof team.fileName !== "string" ||
      typeof team.counter !== "number" ||
      !Number.isSafeInteger(team.counter) ||
      team.counter < 0 ||
      !team.opponents ||
      typeof team.opponents !== "object" ||
      !Array.isArray(team.players) ||
      team.players.length === 0 ||
      !team.players.every(
        (player) =>
          player &&
          Number.isInteger(player.id) &&
          typeof player.name === "string" &&
          Number.isInteger(player.position) &&
          Array.isArray(player.skillPoints) &&
          player.skillPoints.length === 10 &&
          player.skillPoints.every(
            (value) => Number.isInteger(value) && value >= 0 && value <= 65535,
          ),
      )
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
}
