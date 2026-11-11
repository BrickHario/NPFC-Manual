
export const PLAYER_SELECTION_COOKIE = "npfc-player-type-ids";

export type PlayerTypeSelection = {
  id: number;
  name: string;
  imageUrl: string;
  skills: number[];
};

export function parsePlayerIds(value?: string | null): number[] {
  const ids = (value ?? "")
    .split(",")
    .map(Number)
    .filter(
      (id) => Number.isSafeInteger(id) && id > 0
    );

  return [...new Set(ids)];
}

export function getSavedPlayerIds(): number[] {
  if (typeof document === "undefined") return [];

  const entry = document.cookie
    .split("; ")
    .find((item) =>
      item.startsWith(`${PLAYER_SELECTION_COOKIE}=`)
    );

  return parsePlayerIds(
    entry?.slice(PLAYER_SELECTION_COOKIE.length + 1)
  );
}

export function savePlayerIds(ids: number[]) {
  const value = [...new Set(ids)]
    .filter(
      (id) => Number.isSafeInteger(id) && id > 0
    )
    .join(",");

  document.cookie =
    `${PLAYER_SELECTION_COOKIE}=${value}; ` +
    "Path=/; Max-Age=31536000; SameSite=Lax";
}

export function addSavedPlayerId(id: number) {
  savePlayerIds([...getSavedPlayerIds(), id]);
}

export function removeSavedPlayerId(id: number) {
  savePlayerIds(
    getSavedPlayerIds().filter((saved) => saved !== id)
  );
}
