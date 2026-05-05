import { useEffect, useMemo, useState } from "react";
import { detectOllama, generateBuild, type OllamaConnection } from "../lib/ollama";
import { getGame, listAvailableGames } from "../lib/games";
import type { Game, GameId } from "../data/schema";
import type { GenerateBuildResult } from "../types/build";
import { OllamaStatusBar } from "./components/OllamaStatusBar";
import { PromptForm } from "./components/PromptForm";
import { BuildResult } from "./components/BuildResult";

type LoadingState =
  | { kind: "idle" }
  | { kind: "detecting" }
  | { kind: "generating" }
  | { kind: "done"; result: GenerateBuildResult };

export function App() {
  const availableGames = useMemo(() => listAvailableGames(), []);
  const [gameId, setGameId] = useState<GameId>(
    (availableGames[0]?.id as GameId) ?? "dark-souls-3",
  );
  const [connection, setConnection] = useState<OllamaConnection | null>(null);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [chosenModel, setChosenModel] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ kind: "idle" });

  const game: Game | undefined = getGame(gameId);

  useEffect(() => {
    let cancelled = false;
    setLoading({ kind: "detecting" });
    detectOllama().then((conn) => {
      if (cancelled) return;
      setConnection(conn);
      setChosenModel(conn?.defaultModel ?? null);
      setConnectionChecked(true);
      setLoading({ kind: "idle" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(userPrompt: string) {
    if (!connection || !chosenModel || !game) return;
    setLoading({ kind: "generating" });
    const result = await generateBuild({
      url: connection.url,
      model: chosenModel,
      game,
      userPrompt,
    });
    setLoading({ kind: "done", result });
  }

  function reset() {
    setLoading({ kind: "idle" });
  }

  function openOptions() {
    chrome.runtime.openOptionsPage?.();
  }

  const generating = loading.kind === "generating";
  const showResult = loading.kind === "done";
  const result = loading.kind === "done" ? loading.result : null;

  return (
    <>
      <header className="app-header">
        <h1 className="app-title">FS Build Advisor</h1>
        <p className="app-subtitle">
          Recommandations de builds FromSoftware via Ollama (local).
        </p>
      </header>

      <main className="app-body">
        <OllamaStatusBar
          connection={connection}
          checked={connectionChecked}
          chosenModel={chosenModel}
          onModelChange={setChosenModel}
          onOpenOptions={openOptions}
        />

        <div className="field-row">
          <label className="field-label" htmlFor="game-select">
            Jeu
          </label>
          <select
            id="game-select"
            className="field-control"
            value={gameId}
            onChange={(e) => setGameId(e.target.value as GameId)}
          >
            {availableGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.displayName}
              </option>
            ))}
          </select>
        </div>

        {game && (
          <PromptForm
            disabled={!connection || !chosenModel || generating}
            placeholder={`Ex: Je voudrais partir sur un build DEX en jouant un Katana.`}
            onSubmit={handleSubmit}
            onReset={showResult ? reset : undefined}
          />
        )}

        {generating && (
          <div className="loading">Ollama réfléchit à un build…</div>
        )}

        {showResult && result && game && (
          <BuildResult result={result} game={game} />
        )}
      </main>

      <footer className="app-footer">
        <span>
          {connection?.url ? `Ollama : ${connection.url}` : "Ollama : non détecté"}
        </span>
        <button type="button" onClick={openOptions}>
          Options
        </button>
      </footer>
    </>
  );
}
