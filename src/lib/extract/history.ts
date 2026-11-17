const SETTINGS_KEY = "pastepost.settings";
const LEGACY_SETTINGS_KEY = "xtract.settings";

function readLegacy(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function loadSettings(): { bearerToken: string } {
  if (typeof window === "undefined") return { bearerToken: "" };
  try {
    let raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      const legacy = readLegacy(LEGACY_SETTINGS_KEY);
      if (legacy) {
        const legacyParsed = JSON.parse(legacy) as { bearerToken?: string };
        saveSettings({ bearerToken: legacyParsed.bearerToken ?? "" });
        raw = legacy;
      }
    }
    if (!raw) return { bearerToken: "" };
    const parsed = JSON.parse(raw) as { bearerToken?: string };
    return { bearerToken: parsed.bearerToken ?? "" };
  } catch {
    return { bearerToken: "" };
  }
}

export function saveSettings(settings: { bearerToken: string }): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Storage may be unavailable. */ }
}
