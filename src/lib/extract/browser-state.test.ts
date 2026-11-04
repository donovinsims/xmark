import test from "node:test";
import assert from "node:assert/strict";
import { saveHistory, saveSettings } from "./history.ts";
import { loadDrafts, readLocal, writeLocal, readLinkDraft } from "./browser-state.ts";

test("drafts restore and storage failures are harmless", () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) } } });
  writeLocal("pastepost.drafts", JSON.stringify({ input: "https://x.com/a/status/123", bulkText: "123\n456" }));
  assert.deepEqual(loadDrafts(), { input: "https://x.com/a/status/123", bulkText: "123\n456" });
  writeLocal("pastepost.drafts", "null");
  assert.deepEqual(loadDrafts(), { input: "", bulkText: "" });
  writeLocal("pastepost.drafts", "bad json");
  assert.deepEqual(loadDrafts(), { input: "", bulkText: "" });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { get localStorage() { throw new Error("blocked"); } } });
  assert.equal(readLocal("anything"), null);
  assert.doesNotThrow(() => saveHistory([]));
  assert.doesNotThrow(() => saveSettings({ bearerToken: "" }));
  assert.doesNotThrow(() => writeLocal("anything", "value"));
  assert.deepEqual(loadDrafts(), { input: "", bulkText: "" });
  Reflect.deleteProperty(globalThis, "window");
});
test("paste validates clipboard and preserves existing drafts", async () => {
  assert.equal(await readLinkDraft("", async () => " https://x.com/a/status/123 "), "https://x.com/a/status/123");
  await assert.rejects(readLinkDraft("", async () => "unrelated text"), /valid X link/);
  await assert.rejects(readLinkDraft("", async () => { throw new Error("denied"); }), /Clipboard unavailable/);
  let called = false;
  await assert.rejects(readLinkDraft("my draft", async () => { called = true; return "123"; }), /Clear your current draft/);
  assert.equal(called, false);
});
