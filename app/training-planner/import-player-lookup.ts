import {
  readImportedPlayers,
  saveImportedPlayers,
  type ImportedSavePlayer,
} from "./save-parser";
import { getSavedPlayerIds, savePlayerIds } from "./player-selection";

type PlayerLookup = {
  players?: {
    id: number;
    name: string;
    imageUrl: string;
    potentialCurve: number[] | null;
  }[];
  error?: string;
};

export async function lookupImportedPlayers(
  players: readonly ImportedSavePlayer[],
): Promise<ImportedSavePlayer[]> {
  if (players.length === 0) return [];

  const response = await fetch("/api/player-types/lookup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ids: players.map((player) => player.id),
    }),
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(
      `Player lookup API unavailable (HTTP ${response.status}). Check app/api/player-types/lookup/route.ts.`,
    );
  }

  let result: PlayerLookup;

  try {
    result = (await response.json()) as PlayerLookup;
  } catch {
    throw new Error("Player lookup API returned invalid JSON");
  }

  if (!response.ok || !result.players) {
    throw new Error(
      result.error || `Player lookup failed (HTTP ${response.status})`,
    );
  }

  const lookup = new Map(result.players.map((player) => [player.id, player]));

  return players.map((player) => {
    const record = lookup.get(player.id);

    if (!record) {
      throw new Error(`Unknown player ID ${player.id}`);
    }

    return {
      ...player,
      name: record.name,
      imageUrl: record.imageUrl,
      potentialCurve: record.potentialCurve,
    };
  });
}

export async function ensureTeamPlayersImported(
  players: readonly ImportedSavePlayer[],
): Promise<void> {
  const existing = new Set(readImportedPlayers().map((player) => player.id));
  const missing = new Map<number, ImportedSavePlayer>();

  for (const player of players) {
    if (existing.has(player.id) || missing.has(player.id)) continue;

    missing.set(player.id, {
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
      skillPoints: player.skillPoints,
      typeWeights: player.typeWeights,
      extraValues: player.extraValues,
      matchActions: player.matchActions,
      position: player.position,
      foot: player.foot,
      savedTypeIndex: player.savedTypeIndex,
      developmentWeeks: player.developmentWeeks,
      potentialOffsetWeeks: player.potentialOffsetWeeks,
      fatigue: player.fatigue,
      source: "save",
    });
  }

  if (missing.size > 0) {
    const imported = await lookupImportedPlayers([...missing.values()]);
    const merged = new Map(
      readImportedPlayers().map((player) => [player.id, player]),
    );

    for (const player of imported) {
      if (!merged.has(player.id)) merged.set(player.id, player);
    }

    saveImportedPlayers([...merged.values()]);
  }

  const ids = [
    ...new Set([...getSavedPlayerIds(), ...players.map((player) => player.id)]),
  ];
  savePlayerIds(ids);
}
