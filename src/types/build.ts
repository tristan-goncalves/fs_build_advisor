import type { Stat, Tier } from "../data/schema";

export interface WeaponSuggestion {
  id: string;
  rationale: string;
}

export interface BuildRecommendation {
  summary: string;
  targetLevel: number;
  statAllocation: Partial<Record<Stat, number>>;
  weapons: Record<Tier, WeaponSuggestion>;
}

export type GenerateBuildResult =
  | { ok: true; build: BuildRecommendation; rawText: string; modelUsed: string }
  | { ok: false; error: string; rawText?: string; modelUsed?: string };
