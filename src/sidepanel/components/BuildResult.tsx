import type { Game, Tier } from "../../data/schema";
import type { GenerateBuildResult } from "../../types/build";
import { StatsRadarMount } from "./StatsRadarMount";
import { WeaponCard } from "./WeaponCard";

interface Props {
  result: GenerateBuildResult;
  game: Game;
}

const TIER_ORDER: Tier[] = ["early", "mid", "late"];

export function BuildResult({ result, game }: Props) {
  if (!result.ok) {
    return (
      <div className="error-block">
        <strong>Impossible de générer un build.</strong>
        <div style={{ marginTop: 4 }}>{result.error}</div>
        {result.rawText && (
          <pre>{result.rawText.slice(0, 1500)}</pre>
        )}
      </div>
    );
  }

  const { build } = result;

  const weaponsById = new Map(game.weapons.map((w) => [w.id, w]));
  const archetypeLabel =
    game.archetypes.find((a) => a.id === build.archetype)?.label ?? build.archetype;
  const targetLevelLabel = game.metaLevelLabel.replace(
    String(game.metaLevel),
    String(build.targetLevel),
  );

  const groups: { id: string; tiers: Tier[]; rationales: string[] }[] = [];
  for (const tier of TIER_ORDER) {
    const sug = build.weapons[tier];
    if (!sug) continue;
    const existing = groups.find((g) => g.id === sug.id);
    if (existing) {
      existing.tiers.push(tier);
      if (!existing.rationales.includes(sug.rationale)) {
        existing.rationales.push(sug.rationale);
      }
    } else {
      groups.push({ id: sug.id, tiers: [tier], rationales: [sug.rationale] });
    }
  }

  return (
    <section className="result">
      <div>
        <h2 className="result-section-title">Résumé du build</h2>
        <p className="result-summary">{build.summary}</p>
      </div>

      <div>
        <h2 className="result-section-title">Allocation de stats</h2>
        <div className="target-level" style={{ marginBottom: 8 }}>
          Niveau cible : <strong>{targetLevelLabel}</strong> · Archétype :{" "}
          <strong>{archetypeLabel}</strong>
        </div>
        <StatsRadarMount
          stats={build.statAllocation}
          axes={game.stats}
          max={Math.max(60, ...Object.values(build.statAllocation).map((v) => v ?? 0))}
        />
      </div>

      <div>
        <h2 className="result-section-title">Armes recommandées</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groups.map((g) => {
            const weapon = weaponsById.get(g.id);
            if (!weapon) {
              return (
                <div key={g.id} className="error-block">
                  L'IA a recommandé une arme inconnue : <code>{g.id}</code>.
                  Tiers : {g.tiers.join(", ")}.
                </div>
              );
            }
            const rationale = g.rationales.join(" ");
            return (
              <WeaponCard
                key={g.id}
                weapon={weapon}
                tiers={g.tiers}
                rationale={rationale}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
