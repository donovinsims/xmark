import { parseInput } from "./parse.ts";

export function readLocal(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
export function writeLocal(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* Keep in-memory state. */ }
}
export function loadDrafts(): { input: string; bulkText: string } {
  try {
    const value = JSON.parse(readLocal("pastepost.drafts") || "{}");
    return { input: typeof value?.input === "string" ? value.input : "", bulkText: typeof value?.bulkText === "string" ? value.bulkText : "" };
  } catch { return { input: "", bulkText: "" }; }
}
export async function readLinkDraft(current: string, read: () => Promise<string>): Promise<string> {
  if (current.trim()) throw new Error("Clear your current draft before pasting a new link.");
  let text: string;
  try { text = (await read()).trim(); } catch { throw new Error("Clipboard unavailable. Touch and hold the input to paste your link."); }
  if (!parseInput(text).ok) throw new Error("Clipboard doesn’t contain a valid X link or status ID.");
  return text;
}
