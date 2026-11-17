import assert from "node:assert/strict";
import { test } from "node:test";
import { strToU8, zipSync } from "fflate";
import { buildVaultZip, loadBrowserArchive, readVaultZip } from "./backup.ts";
import type { VaultEntry } from "./types.ts";

const post: VaultEntry = {
  favorite: true, trashed: true,
  result: {
    id: "100", kind: "article", source: "fixture", permalink: "https://x.com/example/status/100",
    author: { name: "Example", handle: "example" }, title: "First article", date: "2025-11-05",
    posts: [], markdown: "# First article\n\nComplete text.\n", extractedAt: Date.UTC(2025, 10, 5),
  },
};

test("full export restores complete text, dates, favorites and trash", async () => {
  async function* entries() { yield post; }
  const { blob, count } = await buildVaultZip(entries());
  assert.equal(count, 1);
  assert.deepEqual(readVaultZip(new Uint8Array(await blob.arrayBuffer())), { entries: [post], skipped: 0 });
});

test("legacy ZIP keeps exact extracted Markdown and reads its author and kind", () => {
  const markdown = '---\ntitle: "Example: Article"\nauthor: Example (@example)\ndate: 2025-11-05\nsource: https://x.com/example/status/100\ntype: article\n---\n\nComplete body.\n';
  const { entries, skipped } = readVaultZip(zipSync({ "@example-100.md": strToU8(markdown), "../@example-101.md": strToU8("ignored") }));
  assert.equal(skipped, 0);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.result.kind, "article");
  assert.equal(entries[0]?.result.title, "Example: Article");
  assert.equal(entries[0]?.result.markdown, markdown);
});

test("browser recovery merges both original keys without truncating or replacing records", () => {
  const current = Array.from({ length: 25 }, (_, i) => ({ ...post.result, id: String(100 + i) }));
  const data = new Map([
    ["pastepost.history", JSON.stringify(current)],
    ["xtract.history", JSON.stringify([{ ...post.result, title: "Older copy", saved: true }, { ...post.result, id: "500" }])],
  ]);
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => data.get(key) } });
  try {
    const items = loadBrowserArchive();
    assert.equal(items.length, 26);
    assert.equal(items[0]?.result.title, "First article");
    assert.equal(items[0]?.favorite, true);
    assert.equal(JSON.parse(data.get("pastepost.history")!).length, 25);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
