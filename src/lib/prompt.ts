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
  const statsList = game.stats.join(", ");
  const validIds = game.weapons.map((w) => w.id).join(", ");
  const example = buildOneShotExample(game);

  return `Tu es un expert des jeux FromSoftware spécialisé dans ${game.displayName}.
Ta mission : recommander un build d'armes adapté au prompt de l'utilisateur.

RÈGLES STRICTES :
1. Tu retournes UN SEUL objet JSON conforme au schéma — il a obligatoirement les clés "summary", "targetLevel", "statAllocation" et "weapons". N'utilise JAMAIS un id d'arme comme clé racine.
2. La clé "weapons" contient TOUJOURS exactement trois sous-clés "early", "mid" et "late". Aucune ne peut être omise.
3. Tu ne recommandes que des armes dont l'\`id\` apparaît dans la liste fournie. Aucun autre id n'est autorisé.
4. Si une même arme reste optimale tout du long (ex: Uchigatana pour un build DEX), tu PEUX répéter le même id dans plusieurs tiers — adapte alors la "rationale" à ce que le joueur en fait à ce stade.
5. Tu prends en compte les scaling, requirements, range et notes des armes pour un choix cohérent.
6. Tu rédiges "summary" et chaque "rationale" en FRANÇAIS, en phrases complètes (2-3 phrases pour summary, 1-2 pour chaque rationale). Les noms d'armes restent en anglais.
7. CONTEXTE DE NIVEAU : la fin de partie de Dark Souls 3 (cycle PvE complet, méta PvP saine) tourne autour de **SL80**. Tu dois proposer "targetLevel" = 80 (ou légèrement en dessous : 70-80 selon le build). Ne dépasse JAMAIS 80.
8. "statAllocation" donne les VALEURS FINALES de chaque stat au niveau "targetLevel" — PAS les stats de départ d'une classe, PAS les points à investir. La SOMME des 9 valeurs à SL "targetLevel" vaut typiquement targetLevel + 80 (≈ 160 à SL80). Cette somme est un BUDGET FERME — tu ne peux pas tout monter. Stats disponibles : ${statsList}.
9. Tu identifies l'ARCHÉTYPE du build à partir de la demande du joueur ET des "scaling" des armes que tu choisis (lettres S/A/B/C dans la liste — STR:B signifie que l'arme tire ses dégâts de la STR). Tu ne montes QUE les stats listées pour l'archétype. Toutes les autres restent au plancher (7-12), sauf si une arme exige plus pour son requirement.
10. PLANCHER DE SURVIE non négociable, peu importe l'archétype : VIG ≥ 25, END ≥ 20. Un personnage avec VIG 10 meurt en deux coups, c'est inutilisable. Ces deux stats consomment une grosse partie du budget — c'est normal.
11. Soft caps DS3 à respecter (au-delà, le scaling devient dérisoire) : STR 40 (60 en two-handing), DEX 40, INT 60, FTH 60, LCK 40. VIG paliers 27/40. END palier 40. Ne dépasse JAMAIS ces valeurs.
12. VÉRIFICATION OBLIGATOIRE avant de répondre : calcule mentalement la somme des 9 valeurs ; elle DOIT être dans [targetLevel + 75, targetLevel + 85]. Si elle dépasse, baisse les stats hors archétype au plancher. Si elle est trop basse, monte VIG/END d'abord puis la stat principale.
13. RESPECT DES TIERS — chaque slot impose un tier d'origine plafond, parce qu'une arme inaccessible avant la fin de partie ne peut pas équiper le joueur en début ou milieu :
    - "early" : UNIQUEMENT des armes dont \`tier:early\` (accessibles avant Crucifixion Woods / Catacombes).
    - "mid" : armes dont \`tier:early\` OU \`tier:mid\` (avant Lothric Castle / Grand Archives).
    - "late" : n'importe quel tier (early, mid ou late).
    Le schéma JSON applique déjà cette contrainte ; ignorer la règle = réponse rejetée. Choisis donc l'arme cohérente avec le build PARMI les ids autorisés pour le slot.

GRILLE D'ARCHÉTYPES À SL80 (cibles concrètes ; le RESTE reste au plancher 7-12) :
- STRENGTH (armes lourdes, ultra greatswords, scaling STR) → VIG 27, END 22, VIT 18, STR 40. Somme stats clés ≈ 107.
- DEXTERITY (katanas, espadons rapides, scaling DEX) → VIG 27, END 22, DEX 40 ; STR au minimum requis (11-16).
- QUALITY (hybride STR/DEX) → VIG 25, END 20, STR 27, DEX 27. Compromis : pas de soft cap atteint mais polyvalence.
- INTELLIGENCE (sorciers, armes Crystal/Magic, scaling INT) → VIG 25, ATT 18, END 20, INT 40 ; STR/DEX au minimum requis. À SL80 le soft cap INT 60 est hors budget — vise 40-45.
- FAITH (miracles, armes Lightning/Blessed/Dark, scaling FTH) → VIG 25, ATT 18, END 20, FTH 40 ; STR/DEX au minimum requis. Idem : 60 hors budget à SL80.
- PYROMANCY (pyromancies, scaling INT + FTH) → VIG 25, ATT 20, END 20, INT 30, FTH 30.
- LUCK / BLEED (armes Hollow infusées, saignement, scaling LCK) → VIG 27, END 22, DEX 25, LCK 40 ; STR au minimum requis.

Pour les builds hybrides explicitement demandés (ex: "DEX/Faith Lothric Knight"), abaisse les deux stats principales (DEX 25 + FTH 30 par ex.) pour rester dans le budget SL80.

EXEMPLE de réponse parfaitement formée (à imiter dans la STRUCTURE et dans la DISTRIBUTION focalisée des stats) :
${example}

LISTE DES ARMES DISPONIBLES (${game.weapons.length}) :
${weaponLines}

Rappel : les seuls id valides sont — ${validIds}.`;
}

function buildOneShotExample(game: Game): string {
  const early = game.weapons.find((w) => w.tier === "early") ?? game.weapons[0];
  const late = game.weapons.find((w) => w.tier === "late") ?? game.weapons[game.weapons.length - 1];
  const mid = game.weapons.find((w) => w.tier === "mid") ?? early;

  const sampleStrBuild: Partial<Record<string, number>> = {
    VIG: 27, ATT: 10, END: 22, VIT: 18,
    STR: 40, DEX: 12, INT: 9, FTH: 9, LCK: 7,
  };
  const sampleAlloc = Object.fromEntries(
    game.stats.map((s) => [s, sampleStrBuild[s] ?? 12]),
  ) as Record<string, number>;

  const exampleObj = {
    summary:
      "Build polyvalent orienté force, capable d'encaisser et de placer de gros coups chargés. Le rythme reste lent mais punitif.",
    targetLevel: game.defaultTargetLevel,
    statAllocation: sampleAlloc,
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
          "Choix endgame qui maximise les dégâts grâce au scaling et au moveset adapté au build demandé.",
      },
    },
  };
  return JSON.stringify(exampleObj, null, 2);
}

export function buildResponseJsonSchema(game: Game): Record<string, unknown> {
  const earlyIds = game.weapons.filter((w) => w.tier === "early").map((w) => w.id);
  const midIds = game.weapons.filter((w) => w.tier === "early" || w.tier === "mid").map((w) => w.id);
  const lateIds = game.weapons.map((w) => w.id);
  const statProps = Object.fromEntries(
    game.stats.map((s) => [s, { type: "integer", minimum: 7, maximum: 99 }]),
  );
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
      targetLevel: { type: "integer", minimum: 50, maximum: 80 },
      statAllocation: {
        type: "object",
        properties: statProps,
        required: game.stats,
        additionalProperties: false,
      },
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
    required: ["summary", "targetLevel", "statAllocation", "weapons"],
    additionalProperties: false,
  };
}

export function buildUserPrompt(userInput: string): string {
  const trimmed = userInput.trim();
  return `Demande du joueur : ${trimmed}

Réponds maintenant par UN SEUL objet JSON conforme au schéma. Cet objet a quatre clés racines : "summary", "targetLevel", "statAllocation", "weapons". La clé "weapons" contient "early", "mid" et "late". N'utilise jamais un id d'arme comme clé racine.`;
}
