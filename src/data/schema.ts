export type Tier = "early" | "mid" | "late";
export type AttackRange = "short" | "medium" | "long";

export type Stat = string;

export type ScalingGrade = "S" | "A" | "B" | "C" | "D" | "E" | "-";

export type DamageType =
  | "physical"
  | "magic"
  | "fire"
  | "lightning"
  | "dark"
  | "holy"
  | "blood"
  | "arcane";

export interface Weapon {
  id: string;
  name: string;
  category: string;
  weight: number;
  requirements: Record<Stat, number>;
  scaling: Record<Stat, ScalingGrade>;
  damageTypes: DamageType[];
  range: AttackRange;
  tier: Tier;
  location: string;
  notes?: string;
}

export interface ArchetypeDef {
  id: string;
  label: string;
  mainStat: Stat;
  protectedStats?: Stat[];
  baseDistribution: Record<Stat, number>;
  reduceOrder: Stat[];
}

export type GameId = "dark-souls-3" | "elden-ring" | "bloodborne";

export interface Game {
  id: GameId;
  displayName: string;
  stats: Stat[];
  metaLevel: number;
  metaLevelLabel: string;
  metaStatTotal: number;
  softCaps: Record<Stat, number>;
  softMins: Record<Stat, number>;
  archetypes: ArchetypeDef[];
  tierZones: { early: string; mid: string; late: string };
  weapons: Weapon[];
}
