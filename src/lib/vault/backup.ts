import { strFromU8, strToU8, unzipSync, Zip, ZipPassThrough } from "fflate";
import { downloadFilename } from "../extract/markdown.ts";
import { canonicalPermalink, parseInput } from "../extract/parse.ts";
import { extractResult, vaultEntry } from "./schema.ts";
import type { VaultEntry } from "./types";

const MANIFEST = "pastepost-vault.json";
const FORMAT = "pastepost-vault";
const VERSION = 1;
const LEGACY_MARKDOWN = /^@([A-Za-z0-9_]*)-(\d{1,20})\.md$/;
const RECORD = /^posts\/(\d{1,20})\.json$/;

export function loadBrowserArchive(): VaultEntry[] {
  const items = new Map<string, VaultEntry>();
  for (const key of ["pastepost.history", "xtract.history"]) {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (!Array.isArray(raw)) continue;
      for (const item of raw) {
        const parsed = extractResult.safeParse(item);
        if (!parsed.success) continue;
        const result = parsed.data;
        const existing = items.get(result.id);
        if (existing) existing.favorite ||= result.saved === true;
        else items.set(result.id, { result, favorite: result.saved === true, trashed: false });
      }
    } catch {
      // A missing or damaged key should not hide items in the other key.
    }
  }
  return [...items.values()];
}

export async function buildVaultZip(entries: AsyncIterable<VaultEntry>) {
  const chunks: ArrayBuffer[] = [];
  let failure: Error | undefined;
  let count = 0;
  const zip = new Zip((error, bytes) => {
    if (error) failure = error;
    else if (bytes.length) chunks.push(new Uint8Array(bytes).buffer);
  });
  function write(name: string, content: string) {
    const entry = new ZipPassThrough(name);
    zip.add(entry);
    entry.push(strToU8(content), true);
    if (failure) throw failure;
  }
  try {
    write(MANIFEST, JSON.stringify({ format: FORMAT, version: VERSION }));
    for await (const item of entries) {
      const { result } = item;
      write(`posts/${result.id}.json`, JSON.stringify(item));
      write(`markdown/${downloadFilename(result.author.handle, result.id)}`, result.markdown);
      count++;
    }
    zip.end();
    if (failure) throw failure;
    return { blob: new Blob(chunks, { type: "application/zip" }), count };
  } catch (error) {
    zip.terminate();
    throw error;
  }
}

function frontMatterValue(frontMatter: string, field: string) {
  const raw = new RegExp(`^${field}: (.*)$`, "m").exec(frontMatter)?.[1] ?? "";
  if (!raw.startsWith('"')) return raw;
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "string" ? value : raw;
  } catch { return raw; }
}

function fromLegacyMarkdown(id: string, handle: string, markdown: string): VaultEntry {
  const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown)?.[1] ?? "";
  const author = frontMatterValue(frontMatter, "author");
  const pageUrl = parseInput(frontMatterValue(frontMatter, "source"));
  const kind = frontMatterValue(frontMatter, "type");
  const title = frontMatterValue(frontMatter, "title") || `Post ${id}`;
  return {
    favorite: false, trashed: false,
    result: {
      id, title, kind: kind === "thread" || kind === "article" ? kind : "post",
      date: frontMatterValue(frontMatter, "date"), extractedAt: 0, posts: [], markdown,
      source: "Pastepost Markdown backup", author: { name: author.replace(/ \(@[^)]+\)$/, "") || handle, handle },
      permalink: pageUrl.ok && pageUrl.id === id ? pageUrl.canonical : canonicalPermalink(id, handle),
    },
  };
}

export function readVaultZip(bytes: Uint8Array) {
  // Only read the manifest, exact record paths, and legacy Pastepost filenames.
  // Skip the duplicate Markdown copies in modern archives.
  const manifest = unzipSync(bytes, { filter: (file) => file.name === MANIFEST && file.originalSize <= 1024 })[MANIFEST];
  const modern = manifest !== undefined;
  if (modern) {
    const parsed: unknown = JSON.parse(strFromU8(manifest));
    if (!parsed || typeof parsed !== "object" || !("format" in parsed) || !("version" in parsed) ||
      parsed.format !== FORMAT || parsed.version !== VERSION) {
      throw new Error("This PastePost backup version isn’t supported.");
    }
  }
  let skipped = 0;
  let expandedBytes = 0;
  const files = unzipSync(bytes, { filter: (file) => {
    if (!(modern ? RECORD : LEGACY_MARKDOWN).test(file.name)) return false;
    if (file.originalSize > 4_000_000) { skipped++; return false; }
    expandedBytes += file.originalSize;
    if (expandedBytes > 256_000_000) throw new Error("This ZIP is too large to import at once. Split the posts into smaller ZIPs.");
    return true;
  } });
  const entries = new Map<string, VaultEntry>();
  for (const [name, data] of Object.entries(files)) {
    try {
      const text = strFromU8(data);
      const legacy = LEGACY_MARKDOWN.exec(name);
      const entry = modern ? vaultEntry.parse(JSON.parse(text)) : fromLegacyMarkdown(legacy![2]!, legacy![1]!, text);
      if ((modern && RECORD.exec(name)?.[1] !== entry.result.id) || !entry.result.markdown.trim() || entries.has(entry.result.id)) {
        skipped++;
      } else entries.set(entry.result.id, entry);
    } catch { skipped++; }
  }
  return { entries: [...entries.values()], skipped };
}
