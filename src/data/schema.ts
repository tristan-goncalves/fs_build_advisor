export type Tier = "early" | "mid" | "late";
export type AttackRange = "short" | "medium" | "long";

// Stats canoniques de DS3
export type Stat =
  | "VIG" // Vigor
  | "ATT" // Attunement
  | "END" // Endurance
  | "VIT" // Vitality
  | "STR" // Strength
  | "DEX" // Dexterity
  | "INT" // Intelligence
  | "FTH" // Faith
  | "LCK"; // Luck

export type ScalingGrade = "S" | "A" | "B" | "C" | "D" | "E" | "-";

export type DamageType =
  | "physical"
  | "magic"
  | "fire"
  | "lightning"
  | "dark";

export interface Weapon {
  id: string;
  name: string;
  category: string; // "Katana", "Straight Sword", "Greatsword", etc.
  weight: number;
  requirements: Partial<Record<Stat, number>>;
  scaling: Partial<Record<Stat, ScalingGrade>>;
  damageTypes: DamageType[];
  range: AttackRange;
  tier: Tier; // moment où le joueur peut typiquement l'obtenir (early, mid ou late game)
  location: string;
  notes?: string; // moveset, particularités (saignement, weapon art notable, etc.)
}

export type GameId = "dark-souls-3" | "elden-ring" | "bloodborne";

export interface Game {
  id: GameId;
  displayName: string;
  stats: Stat[];
  defaultTargetLevel: number;
  weapons: Weapon[];
}
