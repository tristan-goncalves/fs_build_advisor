import type { Game, GameId } from "../data/schema";
import darkSouls3 from "../data/games/dark-souls-3.json";

const ds3 = darkSouls3 as unknown as Game;

export const GAMES: Record<GameId, Game | undefined> = {
  "dark-souls-3": ds3,
  "elden-ring": undefined, // TODO
  "bloodborne": undefined, // TODO
};

export function getGame(id: GameId): Game | undefined {
  return GAMES[id];
}

export function listAvailableGames(): Game[] {
  return Object.values(GAMES).filter((g): g is Game => Boolean(g));
}
