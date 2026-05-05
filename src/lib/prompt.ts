import type { Game, Weapon } from "../data/schema";

function describeWeapon(w: Weapon): string {
  const reqs = Object.entries(w.requirements)
    .map(([k, v]) => `${k} ${v}`)
    .join("/");
  const scaling = Object.entries(w.scaling)
    .map(([k, v]) => `${k}:${v}`)
    .join("/");
  const dmg = w.damageTypes.join("+");
  const reqStr = reqs ? ` req[${reqs}]` : "";
  const scalingStr = scaling ? ` scaling[${scaling}]` : "";
  const notes = w.notes ? ` — ${w.notes}` : "";
  return `- ${w.id} | ${w.name} (${w.category}, tier:${w.tier}, range:${w.range}, weight:${w.weight}, dmg:${dmg})${reqStr}${scalingStr} | location: ${w.location}${notes}`;
}

export function buildSystemPrompt(game: Game): string {
  const weaponLines = game.weapons.map(describeWeapon).join("\n");
  const validIds = game.weapons.map((w) => w.id).join(", ");
  const archetypeLines = game.archetypes
    .map((a) => `- ${a.id} : ${a.label}`)
    .join("\n");
  const example = buildOneShotExample(game);
  const minLevel = Math.max(50, game.metaLevel - 30);

  return `Tu es un expert des jeux FromSoftware spécialisé dans ${game.displayName}.
Ta mission : recommander un build d'armes adapté au prompt de l'utilisateur.

RÈGLES STRICTES :
1. Tu retournes UN SEUL objet JSON conforme au schéma — il a obligatoirement les clés "summary", "targetLevel", "archetype" et "weapons". N'utilise JAMAIS un id d'arme comme clé racine.
2. La clé "weapons" contient TOUJOURS exactement trois sous-clés "early", "mid" et "late". Aucune ne peut être omise.
3. Tu ne recommandes que des armes dont l'\`id\` apparaît dans la liste fournie. Aucun autre id n'est autorisé.
4. Si une même arme reste optimale tout du long, tu PEUX répéter le même id dans plusieurs tiers — adapte alors la "rationale" à ce que le joueur en fait à ce stade.
5. Tu prends en compte les scaling, requirements, range et notes des armes pour un choix cohérent.
6. Tu rédiges "summary" et chaque "rationale" en FRANÇAIS, en phrases complètes (2-3 phrases pour summary, 1-2 pour chaque rationale). Les noms d'armes restent en anglais.
7. CONTEXTE DE NIVEAU : la fin de partie de ${game.displayName} (cycle PvE complet, méta PvP saine) tourne autour de **${game.metaLevelLabel}**. Tu dois proposer "targetLevel" = ${game.metaLevel} (ou légèrement en dessous : ${game.metaLevel - 10}-${game.metaLevel} selon le build). Ne dépasse JAMAIS ${game.metaLevel}, ne descends pas en dessous de ${minLevel}.
8. ARCHÉTYPE — tu choisis UNE valeur dans cette liste fermée, à partir de la demande du joueur ET du scaling des armes choisies (lettres S/A/B/C dans la liste — ex. STR:B = scaling STR) :
${archetypeLines}
   Tu n'inventes pas de nouvel archétype. Pour un build hybride explicite, choisis l'archétype dominant.
9. Tu ne renvoies PAS l'allocation de stats — l'application la calcule à partir de "archetype" + "targetLevel" + requirements des armes choisies. Concentre-toi sur l'identification de l'archétype et le choix d'armes cohérent.
10. RESPECT DES TIERS — chaque slot impose un tier d'origine plafond, parce qu'une arme inaccessible avant la fin de partie ne peut pas équiper le joueur en début ou milieu :
    - "early" : UNIQUEMENT des armes \`tier:early\` (${game.tierZones.early}).
    - "mid" : armes \`tier:early\` OU \`tier:mid\` (${game.tierZones.mid}).
    - "late" : n'importe quel tier (${game.tierZones.late}).
    Le schéma JSON applique déjà cette contrainte ; ignorer la règle = réponse rejetée.
11. COHÉRENCE archétype ↔ armes : les armes choisies doivent matcher le scaling de l'archétype (ex. archétype DEXTERITY → armes scaling DEX B/A/S, archétype INTELLIGENCE → armes scaling INT ou damageTypes "magic"). Ne propose pas une arme STR pure pour un build DEX.

EXEMPLE de réponse parfaitement formée (à imiter dans la STRUCTURE) :
${example}

LISTE DES ARMES DISPONIBLES (${game.weapons.length}) :
${weaponLines}

Rappel : les seuls id valides sont — ${validIds}.`;
}

function buildOneShotExample(game: Game): string {
  const early = game.weapons.find((w) => w.tier === "early") ?? game.weapons[0];
  const late = game.weapons.find((w) => w.tier === "late") ?? game.weapons[game.weapons.length - 1];
  const mid = game.weapons.find((w) => w.tier === "mid") ?? early;
  const sampleArchetype = game.archetypes[0]?.id ?? "STRENGTH";

  const exampleObj = {
    summary:
      "Build polyvalent capable d'encaisser et de placer des coups punitifs. Le rythme reste cohérent du début à la fin.",
    targetLevel: game.metaLevel,
    archetype: sampleArchetype,
    weapons: {
      early: {
        id: early.id,
        rationale:
          "Arme accessible en début de partie qui amorce le build sans exigences de stats prohibitives.",
      },
      mid: {
        id: mid.id,
        rationale:
          "Transition vers une arme au scaling plus marqué, une fois les stats principales montées.",
      },
      late: {
        id: late.id,
        rationale:
          "Choix endgame qui maximise les dégâts grâce au scaling et au moveset adapté au build.",
      },
    },
  };
  return JSON.stringify(exampleObj, null, 2);
}

export function buildResponseJsonSchema(game: Game): Record<string, unknown> {
  const earlyIds = game.weapons.filter((w) => w.tier === "early").map((w) => w.id);
  const midIds = game.weapons.filter((w) => w.tier === "early" || w.tier === "mid").map((w) => w.id);
  const lateIds = game.weapons.map((w) => w.id);
  const archetypeIds = game.archetypes.map((a) => a.id);
  const minLevel = Math.max(50, game.metaLevel - 30);
  const weaponSuggestion = (allowedIds: string[]) => ({
    type: "object",
    properties: {
      id: { type: "string", enum: allowedIds },
      rationale: { type: "string", minLength: 10 },
    },
    required: ["id", "rationale"],
    additionalProperties: false,
  });
  return {
    type: "object",
    properties: {
      summary: { type: "string", minLength: 20 },
      targetLevel: { type: "integer", minimum: minLevel, maximum: game.metaLevel },
      archetype: { type: "string", enum: archetypeIds },
      weapons: {
        type: "object",
        properties: {
          early: weaponSuggestion(earlyIds),
          mid: weaponSuggestion(midIds),
          late: weaponSuggestion(lateIds),
        },
        required: ["early", "mid", "late"],
        additionalProperties: false,
      },
    },
    required: ["summary", "targetLevel", "archetype", "weapons"],
    additionalProperties: false,
  };
}

export function buildUserPrompt(userInput: string): string {
  const trimmed = userInput.trim();
  return `Demande du joueur : ${trimmed}

Réponds maintenant par UN SEUL objet JSON conforme au schéma. Cet objet a quatre clés racines : "summary", "targetLevel", "archetype", "weapons". La clé "weapons" contient "early", "mid" et "late". N'utilise jamais un id d'arme comme clé racine. Ne renvoie PAS de "statAllocation" — l'application la calcule.`;
}
