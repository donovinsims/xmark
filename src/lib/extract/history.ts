import type { ExtractResult } from "./types";

const HISTORY_KEY = "pastepost.history";
const SETTINGS_KEY = "pastepost.settings";
const LEGACY_HISTORY_KEY = "xtract.history";
const LEGACY_SETTINGS_KEY = "xtract.settings";
const MAX = 20;

function readLegacy(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function loadHistory(): ExtractResult[] {
  if (typeof window === "undefined") return [];
  try {
    let raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      raw = readLegacy(LEGACY_HISTORY_KEY);
      if (raw) saveHistory(JSON.parse(raw) as ExtractResult[]);
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExtractResult[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: ExtractResult[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX)));
}

export function upsertHistory(
  items: ExtractResult[],
  result: ExtractResult,
): ExtractResult[] {
  const next = [result, ...items.filter((item) => item.id !== result.id)].slice(0, MAX);
  saveHistory(next);
  return next;
}

export function findCached(items: ExtractResult[], id: string): ExtractResult | undefined {
  return items.find((item) => item.id === id);
}

export function toggleSaved(items: ExtractResult[], id: string): ExtractResult[] {
  const next = items.map((item) =>
    item.id === id ? { ...item, saved: !item.saved } : item,
  );
  saveHistory(next);
  return next;
}

export function removeHistory(items: ExtractResult[], id: string): ExtractResult[] {
  const next = items.filter((item) => item.id !== id);
  saveHistory(next);
  return next;
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
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
