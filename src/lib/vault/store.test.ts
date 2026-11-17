import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { createVaultStore } from "./store.server.ts";
import type { ExtractResult } from "../extract/types.ts";

function article(id: string, extractedAt: number, title = "Original article"): ExtractResult {
  return {
    id, extractedAt, kind: "article", source: "Fixture", title,
    permalink: `https://x.com/example/status/${id}`,
    author: { name: "Example", handle: "example" },
    date: "", posts: [], markdown: `# ${title}\n\nThe full article body.\n`,
  };
}

test("older extracts survive bulk imports, retries, and reversible trash", async () => {
  const db = new PGlite();
  try {
    await db.exec('create table "user" (id text primary key); insert into "user" values (\'one\'), (\'two\');');
    await db.exec(await readFile(new URL("../../../migrations/0002_vault.sql", import.meta.url), "utf8"));
    const query = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;
    const one = createVaultStore(query, "one");
    const two = createVaultStore(query, "two");
    const old = article("100", Date.UTC(2025, 10, 5));
    assert.equal(await one.save({ result: old, favorite: true, trashed: false }), true);
    const attempts = await Promise.all(Array.from({ length: 23 }, (_, n) =>
      one.save({ result: article(String(101 + n), Date.UTC(2026, 5, 1) + n), favorite: false, trashed: false })));
    assert.ok(attempts.every(Boolean));
    assert.equal(await one.save({ result: article("100", Date.now(), "Edited"), favorite: false, trashed: false }), false);
    assert.deepEqual(await one.get("100"), { result: old, favorite: true, trashed: false });
    assert.equal(await two.get("100"), null);
    assert.equal(await two.setTrash("100", true), false);
    assert.equal(await one.setTrash("100", true), true);
    assert.equal((await one.list({ filter: "trash", query: "" })).items[0]?.id, "100");
    const firstList = await one.list({ filter: "all", query: "original" });
    assert.equal(firstList.items.length, 20);
    assert.equal((await one.list({ filter: "all", query: "original", cursor: firstList.next! })).items.length, 3);
    const firstPage = await one.exportPage();
    assert.ok(firstPage.next);
    const exported = [...firstPage.items, ...(await one.exportPage(firstPage.next!)).items];
    assert.equal(exported.length, 24);
    assert.equal(exported.find((entry) => entry.result.id === "100")?.trashed, true);
    assert.equal(await one.setTrash("100", false), true);
    assert.deepEqual((await one.get("100"))?.result, old);
  } finally {
    await db.close();
  }
});
