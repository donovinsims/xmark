import type { ExtractResult } from "./types";

const HISTORY_KEY = "xtract.history";
const SETTINGS_KEY = "xtract.settings";
const MAX = 20;

export function loadHistory(): ExtractResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
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

export function loadSettings(): { bearerToken: string } {
  if (typeof window === "undefined") return { bearerToken: "" };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
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
