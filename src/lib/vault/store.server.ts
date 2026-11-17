import type { Sql } from "../db";
import type { VaultCursor, VaultEntry, VaultFilter, VaultPage, VaultSummary } from "./types";

const PAGE_SIZE = 20;
const EXPORT_PAGE_BYTES = 3_500_000;

function nextCursor(item: { id: string; extractedAt: number } | undefined): VaultCursor | null {
  return item ? { id: item.id, at: item.extractedAt } : null;
}

export function createVaultStore(query: Sql["query"], userId: string) {
  return {
    async save(entry: VaultEntry): Promise<boolean> {
      const { saved: _legacyFlag, ...result } = entry.result;
      const rows = await query(
        `insert into vault_items (user_id, post_id, extracted_at, result, favorite, trashed)
         values ($1, $2, $3, $4::jsonb, $5, $6)
         on conflict (user_id, post_id) do nothing returning post_id`,
        [userId, result.id, result.extractedAt, JSON.stringify(result), entry.favorite, entry.trashed],
      );
      return rows.length > 0;
    },
    async get(id: string): Promise<VaultEntry | null> {
      const [entry] = await query<VaultEntry>(
        "select result, favorite, trashed from vault_items where user_id = $1 and post_id = $2",
        [userId, id],
      );
      return entry ?? null;
    },
    async list({ filter, query: search, cursor }: {
      filter: VaultFilter; query: string; cursor?: VaultCursor;
    }): Promise<VaultPage<VaultSummary>> {
      const rows = await query<VaultSummary>(
        `select post_id as id, result->>'kind' as kind, result->>'title' as title,
                result->'author' as author, extracted_at::double precision as "extractedAt", favorite, trashed
         from vault_items
         where user_id = $1 and trashed = $2 and (not $3::boolean or favorite)
           and ($4::bigint is null or (extracted_at, post_id) < ($4, $5))
           and strpos(lower(concat_ws(' ', result->>'title', result->'author'->>'name',
                     result->'author'->>'handle', result->>'kind', post_id)), lower($6)) > 0
         order by extracted_at desc, post_id desc limit $7`,
        [userId, filter === "trash", filter === "favorites", cursor?.at ?? null, cursor?.id ?? null, search, PAGE_SIZE + 1],
      );
      const items = rows.slice(0, PAGE_SIZE);
      return { items, next: rows.length > PAGE_SIZE ? nextCursor(items.at(-1)) : null };
    },
    async exportPage(cursor?: VaultCursor): Promise<VaultPage<VaultEntry>> {
      const rows = await query<VaultEntry>(
        `select result, favorite, trashed from vault_items
         where user_id = $1 and ($2::bigint is null or (extracted_at, post_id) < ($2, $3))
         order by extracted_at desc, post_id desc limit $4`,
        [userId, cursor?.at ?? null, cursor?.id ?? null, PAGE_SIZE + 1],
      );
      const items: VaultEntry[] = [];
      let bytes = 0;
      for (const row of rows.slice(0, PAGE_SIZE)) {
        bytes += new TextEncoder().encode(JSON.stringify(row)).byteLength;
        if (items.length && bytes > EXPORT_PAGE_BYTES) break;
        items.push(row);
      }
      return { items, next: rows.length > items.length ? nextCursor(items.at(-1)?.result) : null };
    },
    async setFavorite(id: string, favorite: boolean): Promise<boolean> {
      const rows = await query(
        "update vault_items set favorite = $3 where user_id = $1 and post_id = $2 returning post_id",
        [userId, id, favorite],
      );
      return rows.length > 0;
    },
    async setTrash(id: string, trashed: boolean): Promise<boolean> {
      const rows = await query(
        "update vault_items set trashed = $3 where user_id = $1 and post_id = $2 returning post_id",
        [userId, id, trashed],
      );
      return rows.length > 0;
    },
  };
}
