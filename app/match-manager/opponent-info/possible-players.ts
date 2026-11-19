import { PLAYER_TEAMS } from "@/lib/utils";

export const SQUAD_BUDGETS = [
  5000, 8000, 12000, 24000, 36000, 45000, 60000, 90000, 130000,
];

const EXCLUDED_PLAYER_IDS = new Set([61, 68, 72, 84, 97, 109, 117]);

type Team = {
  team_id: number;
  strength_lvl: number;
};

type Player = {
  id_player: number;
  price: number | null;
};

export function getSquadSize(team: Team): number {
  return team.team_id >= 31 ? 22 : team.strength_lvl === 0 ? 18 : 23;
}

export function getPossiblePlayers<T extends Player>(
  team: Team,
  players: T[],
  assignedPlayers: Player[],
): T[] {
  const budget = SQUAD_BUDGETS[team.strength_lvl];

  if (budget === undefined) return [];

  if (assignedPlayers.length >= getSquadSize(team)) {
    return [];
  }

  const maxPrice = Math.floor(budget / 5);

  return players.filter((player) => {
    const id = player.id_player;
    const price = player.price;

    if (id < 0 || id >= 792) return false;
    if (id in PLAYER_TEAMS) return false;
    if (EXCLUDED_PLAYER_IDS.has(id)) return false;
    if (price === null || price <= 0) return false;
    if (price > maxPrice) return false;
    if (team.team_id >= 31 && price < 1000) return false;

    return true;
  });
}
