import type { ExtractResult } from "../extract/types";

export type VaultEntry = { result: ExtractResult; favorite: boolean; trashed: boolean };
export type VaultSummary = Pick<ExtractResult, "id" | "kind" | "title" | "author" | "extractedAt"> &
  Pick<VaultEntry, "favorite" | "trashed">;
export type VaultFilter = "all" | "favorites" | "trash";
export type VaultCursor = { at: number; id: string };
export type VaultPage<T> = { items: T[]; next: VaultCursor | null };
