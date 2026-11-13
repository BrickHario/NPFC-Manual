export type ImportedSavePlayer = {
  id: number;
  name: string;
  imageUrl: string;
  skillPoints: number[];
  typeWeights: number[];
  extraValues?: [number, number];
  position: number;
  foot: "L" | "R";
  savedTypeIndex: number;
  developmentWeeks: number;
  potentialOffsetWeeks: number | null;
  source: "save";
  potentialCurve?: number[] | null;
  fatigue: number | null;
};

export type ParsedSave = {
  fileName: string;
  counter: number;
  players: ImportedSavePlayer[];
  emptySlots: number;
};

const SAVE_SIZE = 76120;
const ROSTER_OFFSET = 0xc6e;
const SLOT_SIZE = 0x98;
const SLOT_COUNT = 25;
const EMPTY_PLAYER_ID = 1016;
const MAGIC = "CALCIO3DS";

const IMPORT_STORAGE_KEY = "npfc-imported-save-players-v2";

function readName(bytes: Uint8Array, start: number, length: number): string {
  const region = bytes.subarray(start, start + length);
  const end = region.indexOf(0);
  if (end < 0) throw new Error("Player name is not null-terminated");
  return new TextDecoder("utf-8", { fatal: true })
    .decode(region.subarray(0, end))
    .trim();
}

export function calculateKnownPotentialOffsetWeeks(
  developmentWeeks: number,
  weeksAtClub: number | null
): number | null {
  if (
    weeksAtClub === null ||
    !Number.isSafeInteger(weeksAtClub) ||
    weeksAtClub < 0 ||
    !Number.isSafeInteger(developmentWeeks) ||
    developmentWeeks < 0 ||
    developmentWeeks >= 384
  ) {
    return null;
  }
  return weeksAtClub - developmentWeeks;
}

export function readPlayerFatigue(
  view: DataView,
  playerId: number
): number | null {
  if (
    !Number.isInteger(playerId) ||
    playerId < 0 ||
    playerId > 1015
  ) {
    return null;
  }

  const offset = 0x9716 + playerId * 0x24;

  if (offset + 2 > view.byteLength) return null;

  return view.getInt16(offset, true);
}

export function getFatigueLevel(
  fatigue: number | null
): 0 | 1 | 2 | null {
  if (fatigue === null) return null;

  return fatigue < 400 ? 0 : fatigue < 700 ? 1 : 2;
}

export function parseSave(buffer: ArrayBuffer, fileName: string): ParsedSave {
  if (buffer.byteLength !== SAVE_SIZE) {
    throw new Error(
      `${fileName}: Invalid file size (${buffer.byteLength} bytes)`
    );
  }

  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const signature = new TextDecoder("ascii").decode(
    bytes.subarray(0x08, 0x08 + MAGIC.length)
  );
  if (signature !== MAGIC) {
    throw new Error(`${fileName}: Invalid save signature`);
  }

  const counter = view.getUint32(0x04, true);
  const date = view.getUint16(0x18, true);
  const gameWeek = date >>> 10;
  if (gameWeek > 47) {
    throw new Error(`${fileName}: Invalid calendar week`);
  }

  const players: ImportedSavePlayer[] = [];
  const seenIds = new Set<number>();
  let emptySlots = 0;

  for (let slot = 0; slot < SLOT_COUNT; slot++) {
    const base = ROSTER_OFFSET + slot * SLOT_SIZE;
    if (base + SLOT_SIZE > buffer.byteLength) {
      throw new Error(
        `${fileName}: Roster slot ${slot + 1} is out of bounds`
      );
    }

    const id = view.getUint16(base + 0x00, true);
    const nameStart = base + 0x0c;

    if (id === EMPTY_PLAYER_ID) {
      emptySlots++;
      continue;
    }
    if (bytes[nameStart] === 0) {
      emptySlots++;
      continue;
    }

    let name: string;
    try {
      name = readName(bytes, nameStart, 0x34);
    } catch {
      throw new Error(
        `${fileName}: Invalid name in occupied roster slot ${slot + 1}`
      );
    }
    if (!name) {
      emptySlots++;
      continue;
    }
    if (id === 0) {
      throw new Error(
        `${fileName}: Invalid player ID 0 in roster slot ${slot + 1}`
      );
    }
    if (seenIds.has(id)) {
      throw new Error(
        `${fileName}: Duplicate player ID ${id} in roster slot ${slot + 1}`
      );
    }
    seenIds.add(id);

    const positionAndFoot = view.getUint8(base + 0x06);
    const skillPoints = Array.from({ length: 10 }, (_, index) =>
      view.getUint16(base + 0x40 + index * 2, true)
    );
    const developmentWeeks = view.getUint16(base + 0x54, true);
    if (developmentWeeks > 384) {
      throw new Error(
        `${fileName}: Invalid development counter in slot ${slot + 1}`
      );
    }

    const typeWeights = Array.from({ length: 12 }, (_, index) =>
      view.getUint8(base + 0x6a + index)
    );

    players.push({
      id,
      name,
      imageUrl: "",
      skillPoints,
      typeWeights,
      position: positionAndFoot & 0x0f,
      foot: (positionAndFoot & 0x10) !== 0 ? "L" : "R",
      savedTypeIndex: view.getUint8(base + 0x68),
      developmentWeeks,
      fatigue: readPlayerFatigue(view, id),
      potentialOffsetWeeks: null,
      source: "save",
    });
  }

  if (players.length === 0) {
    throw new Error(`${fileName}: No occupied player slots found`);
  }

  return { fileName, counter, players, emptySlots };
}

export async function parseSaveFiles(files: File[]): Promise<ParsedSave> {
  if (files.length === 0 || files.length > 3) {
    throw new Error(
      "Select savedata0.bin, savedata1.bin, savedata2.bin or all three"
    );
  }

  const saves: ParsedSave[] = [];
  const errors: string[] = [];
  const names = new Set<string>();

  for (const file of files) {
    const match = file.name.toLowerCase().match(
      /^(savedata[012])(?:\s*\(\d+\))?\.bin$/
    );
    if (!match) {
      errors.push(`Unsupported file: ${file.name}`);
      continue;
    }
    const normalizedName = `${match[1]}.bin`;
    if (names.has(normalizedName)) {
      errors.push(`Duplicate file: ${normalizedName}`);
      continue;
    }
    names.add(normalizedName);

    try {
      const buffer = await file.arrayBuffer();
      const save = parseSave(buffer, file.name);
      saves.push(save);
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : `${file.name}: Unable to read save`
      );
    }
  }

  if (saves.length === 0) {
    throw new Error(errors.join("\n") || "No valid NPFC save found");
  }
  saves.sort((a, b) => b.counter - a.counter);
  return saves[0];
}

export function readImportedPlayers(): ImportedSavePlayer[] {
  try {
    const raw = localStorage.getItem(IMPORT_STORAGE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const seenIds = new Set<number>();

    return value.filter(
      (player): player is ImportedSavePlayer => {
        if (!player || typeof player !== "object") return false;
        const item = player as Partial<ImportedSavePlayer>;
        const valid =
          item.source === "save" &&
          typeof item.id === "number" &&
          Number.isSafeInteger(item.id) &&
          item.id > 0 &&
          item.id !== EMPTY_PLAYER_ID &&
          !seenIds.has(item.id) &&
          typeof item.name === "string" &&
          item.name.length > 0 &&
          typeof item.imageUrl === "string" &&
          Array.isArray(item.skillPoints) &&
          item.skillPoints.length === 10 &&
          item.skillPoints.every(
            (n) => Number.isInteger(n) && n >= 0 && n <= 65535
          ) &&
          Array.isArray(item.typeWeights) &&
          item.typeWeights.length === 12 &&
          item.typeWeights.every(
            (n) => Number.isInteger(n) && n >= 0 && n <= 255
          ) &&
          typeof item.developmentWeeks === "number" &&
          Number.isInteger(item.developmentWeeks) &&
          item.developmentWeeks >= 0 &&
          item.developmentWeeks <= 384 &&
          (item.potentialOffsetWeeks === null ||
            (typeof item.potentialOffsetWeeks === "number" &&
              Number.isInteger(item.potentialOffsetWeeks))) &&
          (item.fatigue === undefined ||
            item.fatigue === null ||
            (typeof item.fatigue === "number" &&
              Number.isInteger(item.fatigue)));
        if (valid) seenIds.add(item.id!);
        return valid;
      }
    ).map((player) => ({
      ...player,
      imageUrl: `/player-images/${String(player.id).padStart(4, "0")}.png`,
    }));
  } catch {
    return [];
  }
}

export function saveImportedPlayers(players: ImportedSavePlayer[]) {
  localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(players));
}

export function removeImportedPlayer(id: number) {
  saveImportedPlayers(
    readImportedPlayers().filter((player) => player.id !== id)
  );
}
