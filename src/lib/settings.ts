export interface AppSettings {
  ollamaUrl?: string;
  preferredModel?: string;
}

const STORAGE_KEY = "fs-build-advisor:settings";

export async function loadSettings(): Promise<AppSettings> {
  try {
    const res = await chrome.storage.local.get(STORAGE_KEY);
    return (res?.[STORAGE_KEY] ?? {}) as AppSettings;
  } catch {
    return {};
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  } catch {
  }
}

export async function patchSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await saveSettings(next);
  return next;
}
