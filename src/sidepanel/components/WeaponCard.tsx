import type { Tier, Weapon } from "../../data/schema";

interface Props {
  weapon: Weapon;
  tiers: Tier[];
  rationale: string;
}

const TIER_LABEL: Record<Tier, string> = {
  early: "Early",
  mid: "Mid",
  late: "Late",
};

export function WeaponCard({ weapon, tiers, rationale }: Props) {
  const reqEntries = Object.entries(weapon.requirements);
  const scalingEntries = Object.entries(weapon.scaling);

  return (
    <article className="weapon-card">
      <div className="weapon-card-header">
        <div>
          <h3 className="weapon-name">{weapon.name}</h3>
          <div className="weapon-category">
            {weapon.category} · portée {translateRange(weapon.range)} · {weapon.weight} wt
          </div>
        </div>
        <div className="tier-badges">
          {tiers.map((t) => (
            <span key={t} className="tier-badge" data-tier={t}>
              {TIER_LABEL[t]}
            </span>
          ))}
        </div>
      </div>

      <dl className="weapon-stats-grid">
        <dt>Requirements</dt>
        <dd>
          {reqEntries.length === 0
            ? "—"
            : reqEntries.map(([k, v]) => `${k} ${v}`).join(" · ")}
        </dd>
        <dt>Scaling</dt>
        <dd>
          {scalingEntries.length === 0
            ? "—"
            : scalingEntries.map(([k, v]) => `${k} ${v}`).join(" · ")}
        </dd>
        <dt>Dégâts</dt>
        <dd>{weapon.damageTypes.map(translateDamage).join(" + ")}</dd>
        <dt>Tier d'origine</dt>
        <dd>{TIER_LABEL[weapon.tier]} game</dd>
      </dl>

      <p className="weapon-location">{weapon.location}</p>

      {weapon.notes && <p className="weapon-notes">{weapon.notes}</p>}

      <div className="weapon-rationale-block">
        <p className="weapon-rationale">
          <strong>Pourquoi :</strong> {rationale}
        </p>
      </div>
    </article>
  );
}

function translateRange(r: Weapon["range"]): string {
  switch (r) {
    case "short":
      return "courte";
    case "medium":
      return "moyenne";
    case "long":
      return "longue";
  }
}

function translateDamage(d: Weapon["damageTypes"][number]): string {
  switch (d) {
    case "physical":
      return "physique";
    case "magic":
      return "magie";
    case "fire":
      return "feu";
    case "lightning":
      return "foudre";
    case "dark":
      return "ténèbres";
  }
}
