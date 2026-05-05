import type { ArchetypeDef, Game, Stat, Weapon } from "../data/schema";

const FLOOR = 7;

export function getArchetype(game: Game, archetypeId: string): ArchetypeDef | null {
  return game.archetypes.find((a) => a.id === archetypeId) ?? null;
}

export function computeRequirementFloors(
  weapons: Weapon[],
): Record<Stat, number> {
  const floors: Record<Stat, number> = {};
  for (const w of weapons) {
    for (const [stat, val] of Object.entries(w.requirements)) {
      const current = floors[stat] ?? 0;
      if (val > current) floors[stat] = val;
    }
  }
  return floors;
}

export function computeTargetSum(game: Game, targetLevel: number): number {
  return game.metaStatTotal - (game.metaLevel - targetLevel);
}

export function deriveStatAllocation(
  game: Game,
  archetype: ArchetypeDef,
  targetLevel: number,
  requirementFloors: Record<Stat, number> = {},
): Record<Stat, number> {
  const targetSum = computeTargetSum(game, targetLevel);
  const stats: Record<Stat, number> = {};
  for (const stat of game.stats) {
    stats[stat] = archetype.baseDistribution[stat] ?? FLOOR;
  }

  for (const [stat, val] of Object.entries(requirementFloors)) {
    if (!(stat in stats)) continue;
    if (stats[stat] < val) stats[stat] = val;
  }

  let currentSum = sumStats(stats);

  if (currentSum > targetSum) {
    const reduceTo = (stat: Stat, target: number) => {
      const minForStat = Math.max(target, requirementFloors[stat] ?? 0);
      while (stats[stat] > minForStat && currentSum > targetSum) {
        stats[stat] -= 1;
        currentSum -= 1;
      }
    };
    const order = archetype.reduceOrder;
    const protectedStats = archetype.protectedStats ?? [archetype.mainStat];
    for (const stat of order) {
      if (currentSum <= targetSum) break;
      if (protectedStats.includes(stat)) continue;
      reduceTo(stat, game.softMins[stat] ?? FLOOR);
    }
    for (const stat of order) {
      if (currentSum <= targetSum) break;
      if (protectedStats.includes(stat)) continue;
      reduceTo(stat, FLOOR);
    }
    if (currentSum > targetSum) {
      for (const stat of protectedStats) {
        if (currentSum <= targetSum) break;
        reduceTo(stat, FLOOR);
      }
    }
  } else if (currentSum < targetSum) {
    const main = archetype.mainStat;
    const cap = game.softCaps[main] ?? archetype.baseDistribution[main] ?? FLOOR;
    while (stats[main] < cap && currentSum < targetSum) {
      stats[main] += 1;
      currentSum += 1;
    }
  }

  return stats;
}

function sumStats(stats: Record<Stat, number>): number {
  return Object.values(stats).reduce((a, b) => a + b, 0);
}
