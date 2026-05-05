import { useState, type FormEvent } from "react";

interface Props {
  disabled: boolean;
  placeholder?: string;
  onSubmit: (userPrompt: string) => void;
  onReset?: () => void;
}

export function PromptForm({ disabled, placeholder, onSubmit, onReset }: Props) {
  const [value, setValue] = useState("");

  function handle(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <form className="field-row" onSubmit={handle}>
      <label className="field-label" htmlFor="prompt-input">
        Décris le build que tu veux
      </label>
      <textarea
        id="prompt-input"
        className="field-control"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button
          type="submit"
          className="btn-primary"
          disabled={disabled || !value.trim()}
        >
          Recommander un build
        </button>
        {onReset && (
          <button type="button" className="btn-secondary" onClick={onReset}>
            Effacer
          </button>
        )}
      </div>
    </form>
  );
}
