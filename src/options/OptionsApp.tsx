import { useEffect, useState } from "react";
import { loadSettings, patchSettings } from "../lib/settings";
import { testOllamaUrl, type OllamaModel } from "../lib/ollama";

type TestState =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; models: OllamaModel[] }
  | { kind: "err"; message: string };

export function OptionsApp() {
  const [url, setUrl] = useState("http://localhost:11434");
  const [preferredModel, setPreferredModel] = useState<string>("");
  const [testState, setTestState] = useState<TestState>({ kind: "idle" });
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    loadSettings().then((s) => {
      if (s.ollamaUrl) setUrl(s.ollamaUrl);
      if (s.preferredModel) setPreferredModel(s.preferredModel);
    });
  }, []);

  async function handleTest() {
    setTestState({ kind: "testing" });
    const res = await testOllamaUrl(url.trim());
    if (res.ok) {
      setTestState({ kind: "ok", models: res.models });
      if (!preferredModel && res.models.length > 0) {
        setPreferredModel(res.models[0].name);
      }
    } else {
      setTestState({ kind: "err", message: res.error });
    }
  }

  async function handleSave() {
    await patchSettings({
      ollamaUrl: url.trim() || undefined,
      preferredModel: preferredModel.trim() || undefined,
    });
    setSavedAt(Date.now());
  }

  const models = testState.kind === "ok" ? testState.models : [];

  return (
    <>
      <header className="app-header" style={{ padding: 0, border: "none", background: "transparent" }}>
        <h1 className="app-title">Options</h1>
        <p className="app-subtitle">Connexion à Ollama et choix du modèle.</p>
      </header>

      <div className="options-section">
        <div className="field-row">
          <label className="field-label" htmlFor="opt-url">
            URL du serveur Ollama
          </label>
          <div className="options-row">
            <input
              id="opt-url"
              className="field-control"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:11434"
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTest}
              disabled={testState.kind === "testing"}
            >
              {testState.kind === "testing" ? "Test…" : "Tester"}
            </button>
          </div>
          <p className="help-text">
            Par défaut Ollama écoute sur <code>http://localhost:11434</code>.
            Lance <code>ollama serve</code> dans un terminal si ce n'est pas déjà le cas.
          </p>
          {testState.kind === "ok" && (
            <p className="feedback-ok">
              ✓ Connecté — {testState.models.length} modèle(s) installé(s).
            </p>
          )}
          {testState.kind === "err" && (
            <p className="feedback-err">✗ {testState.message}</p>
          )}
        </div>

        <div className="field-row">
          <label className="field-label" htmlFor="opt-model">
            Modèle préféré
          </label>
          {models.length > 0 ? (
            <select
              id="opt-model"
              className="field-control"
              value={preferredModel}
              onChange={(e) => setPreferredModel(e.target.value)}
            >
              <option value="">— Détection automatique —</option>
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="opt-model"
              className="field-control"
              type="text"
              value={preferredModel}
              onChange={(e) => setPreferredModel(e.target.value)}
              placeholder="ex: llama3.1 (laisser vide pour détection auto)"
            />
          )}
          <p className="help-text">
            Recommandé : un modèle ≥ 7B paramètres pour des recommandations cohérentes.
            Exemples : <code>llama3.1</code>, <code>qwen2.5</code>, <code>mistral</code>.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" className="btn-primary" onClick={handleSave}>
            Sauvegarder
          </button>
          {savedAt && (
            <span className="feedback-ok">✓ Sauvegardé.</span>
          )}
        </div>
      </div>
    </>
  );
}
