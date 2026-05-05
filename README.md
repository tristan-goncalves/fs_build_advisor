# FS Build Advisor

Extension Chrome (Manifest V3) qui recommande des **builds d'armes** pour les jeux FromSoftware en interrogeant un modèle **Ollama** local.

> Première version : **Dark Souls III** (≈ 37 armes curées).
> L'architecture est prévue pour ajouter Elden Ring et Bloodborne sans refacto (un JSON par jeu, registry centralisé).

---

## Stack & contraintes du projet

- **Framework frontend** : React 18 + TypeScript
- **Build tool** : Vite + `@crxjs/vite-plugin` (manifest V3 natif, HMR)
- **WebComponent intégré dans le framework** : `<stats-radar>` — Custom Element natif avec Shadow DOM, qui dessine un radar SVG des 9 stats DS3 (VIG, ATT, END, VIT, STR, DEX, INT, FTH, LCK). Utilisé depuis React via un mini wrapper `StatsRadarMount.tsx`.
- **Complexité** : intégration d'IA locale (Ollama) avec auto-détection, listing des modèles, et appel `/api/generate` en mode `format: "json"` pour parser la réponse côté React.

---

## Prérequis

1. **Node.js** ≥ 18.
2. **Chrome / Chromium** (qui supporte l'API `chrome.sidePanel` — toute version moderne).
3. **Ollama** installé localement : <https://ollama.com>
   - Lancer le serveur : `ollama serve` (dans un terminal séparé, ou via l'app Ollama).
   - Télécharger un modèle : `ollama pull llama3.1` (recommandé). Alternatives : `qwen2.5`, `mistral`, `gemma2`.

---

## Installation

```bash
npm install
npm run dev
```

`npm run dev` lance Vite en mode dev avec HMR — la sortie se trouve dans `dist/`.

Pour un build de production :

```bash
npm run build
```

### Charger l'extension dans Chrome

1. Aller à `chrome://extensions`.
2. Activer le **Mode développeur** (en haut à droite).
3. Cliquer **Charger l'extension non empaquetée** et sélectionner le dossier `dist/`.
4. Cliquer sur l'icône de l'extension dans la barre d'outils → le **side panel** s'ouvre à droite.

> ⚠️ Si tu utilises `npm run dev`, recharge l'extension depuis `chrome://extensions` après le premier build.

---

## Utilisation

1. Ouvre le side panel via l'icône de l'extension.
2. Si Ollama tourne, tu verras "Ollama prêt sur http://localhost:11434" en haut. Sinon, lance `ollama serve` puis recharge.
3. Choisis le jeu (DS3 par défaut).
4. Tape un prompt, par exemple :
   - "Je voudrais partir sur un build DEX en jouant un Katana."
   - "Build pure STR avec une grosse arme."
   - "Build Faith avec une straight sword pour les miracles."
   - "Spellsword INT/DEX, idéalement une scythe ou une greatsword qui scale aussi en INT."
5. L'IA renvoie :
   - un **résumé** du build (2-3 phrases),
   - un **niveau cible** (SL),
   - un **radar de stats** (le WebComponent) montrant l'allocation,
   - des **cards d'armes** : une par tier de progression (early / mid / late). Si l'IA juge qu'une seule arme reste optimale du début à la fin, elle apparaît en card consolidée avec plusieurs badges de tier.

---

## Architecture

```
src/
├── manifest.ts                → Manifest V3 (sidePanel, options, host_permissions Ollama)
├── background/
│   └── service-worker.ts      → ouvre le side panel au clic sur l'icône
├── sidepanel/                 → UI principale (React)
│   ├── App.tsx                → état global, flow utilisateur
│   ├── main.tsx               → entry React + import du WebComponent
│   ├── styles.css             → thème sombre style FromSoftware
│   └── components/
│       ├── OllamaStatusBar.tsx
│       ├── PromptForm.tsx
│       ├── BuildResult.tsx    → consolidation des tiers + parse JSON
│       ├── WeaponCard.tsx
│       └── StatsRadarMount.tsx  → wrapper React du WebComponent
├── options/                   → page d'options (URL Ollama + modèle préféré)
├── web-components/
│   └── StatsRadar.ts          → <stats-radar> Custom Element (Shadow DOM, SVG)
├── lib/
│   ├── ollama.ts              → detect, listModels, generateBuild (format:"json")
│   ├── prompt.ts              → system prompt + injection du dataset
│   ├── games.ts               → registry { "dark-souls-3": ... }
│   └── settings.ts            → wrapper chrome.storage.local
├── data/
│   ├── schema.ts              → types TS (Weapon, Game, Stat, Tier...)
│   └── games/
│       └── dark-souls-3.json  → 37 armes curées
└── types/
    ├── build.ts               → BuildRecommendation (réponse IA)
    └── jsx.d.ts               → déclaration JSX du <stats-radar>
```

### Comment l'IA reçoit-elle les données ?

Le system prompt (`src/lib/prompt.ts`) injecte une représentation compacte de chaque arme :

```
- uchigatana | Uchigatana (Katana, tier:early, range:medium, weight:5.5, dmg:physical) req[STR 11/DEX 16] scaling[STR:C/DEX:B] | location: ... — notes: ...
```

Plus la liste explicite des `id` valides. L'IA est forcée à répondre par un JSON conforme :

```json
{
  "summary": "...",
  "targetLevel": 120,
  "statAllocation": { "VIG": 27, "END": 25, "STR": 14, "DEX": 40, ... },
  "weapons": {
    "early": { "id": "uchigatana", "rationale": "..." },
    "mid":   { "id": "washing-pole", "rationale": "..." },
    "late":  { "id": "frayed-blade", "rationale": "..." }
  }
}
```

Si parsing JSON échoue, le bloc d'erreur affiche le texte brut renvoyé par le modèle (utile pour debug).

### Ajouter un jeu

1. Créer `src/data/games/<game-id>.json` conforme au schéma `Game` (voir `src/data/schema.ts`).
2. L'importer dans `src/lib/games.ts` et l'ajouter au registry.
3. C'est tout — l'UI et le prompt builder sont déjà génériques.

---

## Limites connues

- Les petits modèles (< 7B paramètres) peuvent rater le format JSON. Si ça arrive, l'extension affiche le texte brut avec un message d'erreur.
- Le dataset DS3 est curé (~37 armes), pas exhaustif. C'est volontaire pour garder un contexte raisonnable côté Ollama.
- Pas d'historique de conversation : chaque prompt est indépendant (choix de design).
