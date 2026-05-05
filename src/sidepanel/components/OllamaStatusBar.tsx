import type { OllamaConnection } from "../../lib/ollama";

interface Props {
  connection: OllamaConnection | null;
  checked: boolean;
  chosenModel: string | null;
  onModelChange: (model: string) => void;
  onOpenOptions: () => void;
}

export function OllamaStatusBar({
  connection,
  checked,
  chosenModel,
  onModelChange,
  onOpenOptions,
}: Props) {
  if (!checked) {
    return (
      <div className="status-bar">
        <span className="status-dot" />
        <span>Détection d'Ollama…</span>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="status-bar is-error">
        <span className="status-dot" />
        <span>
          Ollama est introuvable. Lance{" "}
          <code>ollama serve</code> puis <code>ollama pull llama3.1</code>, ou{" "}
          <button
            type="button"
            className="btn-secondary"
            style={{ display: "inline", padding: "2px 6px" }}
            onClick={onOpenOptions}
          >
            ouvre les options
          </button>{" "}
          pour configurer une URL.
        </span>
      </div>
    );
  }

  if (connection.models.length === 0) {
    return (
      <div className="status-bar is-error">
        <span className="status-dot" />
        <span>
          Ollama répond à {connection.url} mais aucun modèle n'est installé.
          Exécute <code>ollama pull llama3.1</code>.
        </span>
      </div>
    );
  }

  return (
    <div className="status-bar is-ok">
      <span className="status-dot" />
      <span>Ollama prêt sur {connection.url}</span>
      <label
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          color: "var(--text-dim)",
        }}
      >
        Modèle :
        <select
          value={chosenModel ?? ""}
          onChange={(e) => onModelChange(e.target.value)}
          className="field-control"
          style={{ padding: "3px 8px", fontSize: 12 }}
        >
          {connection.models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
