import type { ArchetypeDef, Game, Weapon } from "../data/schema";
import type { BuildRecommendation, GenerateBuildResult } from "../types/build";
import {
  computeRequirementFloors,
  deriveStatAllocation,
  getArchetype,
} from "./archetypes";
import { buildResponseJsonSchema, buildSystemPrompt, buildUserPrompt } from "./prompt";
import { loadSettings } from "./settings";

const CANDIDATE_HOSTS = [
  "http://localhost:11434",
  "http://127.0.0.1:11434",
];

const PREFERRED_MODELS = [
  "llama3.1",
  "llama3.1:8b",
  "llama3",
  "llama3:8b",
  "qwen2.5",
  "qwen2.5:7b",
  "mistral",
  "mistral:7b",
  "gemma2",
];

export interface OllamaModel {
  name: string;
  size?: number;
  modified_at?: string;
}

export interface OllamaConnection {
  url: string;
  models: OllamaModel[];
  defaultModel: string | null;
}

async function tryFetchTags(url: string, timeoutMs = 1500): Promise<OllamaModel[] | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${url}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) {
      console.warn(`[ollama] /api/tags ${url} → HTTP ${res.status} ${res.statusText}`);
      return null;
    }
    const data = (await res.json()) as { models?: OllamaModel[] };
    console.info(`[ollama] /api/tags ${url} OK (${data.models?.length ?? 0} modèle(s))`);
    return data.models ?? [];
  } catch (err) {
    console.warn(`[ollama] /api/tags ${url} a échoué :`, err);
    return null;
  }
}

function pickDefaultModel(
  models: OllamaModel[],
  preferred?: string,
): string | null {
  if (models.length === 0) return null;
  const names = models.map((m) => m.name);

  if (preferred && names.includes(preferred)) return preferred;

  for (const candidate of PREFERRED_MODELS) {
    const exact = names.find((n) => n === candidate);
    if (exact) return exact;
    const startsWith = names.find((n) => n.startsWith(`${candidate}:`));
    if (startsWith) return startsWith;
  }

  return names[0];
}

export async function detectOllama(): Promise<OllamaConnection | null> {
  const settings = await loadSettings();
  const candidates: string[] = [];
  if (settings.ollamaUrl) candidates.push(settings.ollamaUrl);
  for (const c of CANDIDATE_HOSTS) {
    if (!candidates.includes(c)) candidates.push(c);
  }

  console.info("[ollama] détection — hôtes candidats :", candidates);

  for (const url of candidates) {
    const models = await tryFetchTags(url);
    if (models !== null) {
      const defaultModel = pickDefaultModel(models, settings.preferredModel);
      console.info(`[ollama] détecté sur ${url} (modèle par défaut : ${defaultModel ?? "aucun"})`);
      return { url, models, defaultModel };
    }
  }

  console.warn("[ollama] aucun serveur Ollama joignable parmi les hôtes candidats");
  return null;
}

export async function testOllamaUrl(url: string): Promise<{ ok: true; models: OllamaModel[] } | { ok: false; error: string }> {
  const models = await tryFetchTags(url, 3000);
  if (models === null) {
    return { ok: false, error: `Impossible de joindre Ollama à ${url}` };
  }
  return { ok: true, models };
}

interface GenerateOptions {
  url: string;
  model: string;
  game: Game;
  userPrompt: string;
}

export async function generateBuild(
  opts: GenerateOptions,
): Promise<GenerateBuildResult> {
  const { url, model, game, userPrompt } = opts;

  const system = buildSystemPrompt(game);
  const prompt = buildUserPrompt(userPrompt);
  const schema = buildResponseJsonSchema(game);

  let rawText = "";
  try {
    console.info(`[ollama] POST ${url}/api/generate (model=${model})`);
    const res = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        system,
        prompt,
        stream: false,
        format: schema,
        options: {
          temperature: 0.4,
          num_predict: 2048,
        },
      }),
    });

    if (!res.ok) {
      const body = await safeReadText(res);
      console.error(
        `[ollama] /api/generate a échoué : HTTP ${res.status} ${res.statusText}`,
        body ? { body } : undefined,
      );
      return {
        ok: false,
        error: explainOllamaHttpError(res.status, body),
        modelUsed: model,
      };
    }

    const data = (await res.json()) as { response?: string };
    rawText = data.response ?? "";

    if (!rawText.trim()) {
      console.error("[ollama] /api/generate : réponse vide", data);
      return { ok: false, error: "Réponse vide d'Ollama.", modelUsed: model };
    }

    const parsed = parseBuildJson(rawText);
    if (!parsed) {
      console.error("[ollama] JSON build invalide. rawText =", rawText);
      return {
        ok: false,
        error: "La réponse de l'IA n'est pas un JSON valide pour un build.",
        rawText,
        modelUsed: model,
      };
    }

    const archetype = getArchetype(game, parsed.archetype);
    if (!archetype) {
      console.error("[ollama] archétype inconnu :", parsed.archetype);
      return {
        ok: false,
        error: `L'IA a renvoyé un archétype inconnu : "${parsed.archetype}".`,
        rawText,
        modelUsed: model,
      };
    }

    const enriched = enrichBuildWithStats(parsed, archetype, game);

    console.info("[ollama] build généré avec succès");
    return { ok: true, build: enriched, rawText, modelUsed: model };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ollama] erreur réseau /api/generate :", err);
    return { ok: false, error: `Erreur réseau Ollama : ${msg}`, rawText, modelUsed: model };
  }
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function explainOllamaHttpError(status: number, body: string): string {
  if (status === 403) {
    return (
      "Ollama a renvoyé 403 Forbidden. " +
      "L'extension est bloquée par la politique CORS d'Ollama. " +
      "Définis la variable d'environnement OLLAMA_ORIGINS=chrome-extension://* " +
      "puis redémarre Ollama (voir README)."
    );
  }
  if (status === 404) {
    return (
      "Ollama a renvoyé 404. Le modèle demandé n'est probablement pas installé. " +
      "Lance `ollama pull <modèle>` puis réessaie."
    );
  }
  const tail = body ? ` — ${body.slice(0, 200)}` : "";
  return `Ollama a répondu avec le statut ${status}.${tail}`;
}

interface RawLlmBuild {
  summary: string;
  targetLevel: number;
  archetype: string;
  weapons: BuildRecommendation["weapons"];
}

function parseBuildJson(text: string): RawLlmBuild | null {
  const direct = safeJsonParse(text);
  if (direct && looksLikeBuild(direct)) return direct as RawLlmBuild;

  const extracted = extractFirstJsonObject(text);
  if (extracted) {
    const parsed = safeJsonParse(extracted);
    if (parsed && looksLikeBuild(parsed)) return parsed as RawLlmBuild;
  }

  return null;
}

function enrichBuildWithStats(
  raw: RawLlmBuild,
  archetype: ArchetypeDef,
  game: Game,
): BuildRecommendation {
  const weaponsById = new Map(game.weapons.map((w) => [w.id, w]));
  const chosen: Weapon[] = Object.values(raw.weapons)
    .map((s) => weaponsById.get(s.id))
    .filter((w): w is Weapon => Boolean(w));
  const reqFloors = computeRequirementFloors(chosen);
  const statAllocation = deriveStatAllocation(game, archetype, raw.targetLevel, reqFloors);
  return { ...raw, statAllocation };
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function looksLikeBuild(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.summary === "string" &&
    typeof v.targetLevel === "number" &&
    typeof v.archetype === "string" &&
    typeof v.weapons === "object" &&
    v.weapons !== null
  );
}
