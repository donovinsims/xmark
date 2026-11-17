import { useEffect, useRef, useState } from "react";
import { Bookmark, Copy, Download, FolderOpen, RotateCcw, Search, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { buildVaultZip, loadBrowserArchive, readVaultZip } from "@/lib/vault/backup";
import { changeVaultPost, exportVaultPage, getVaultPost, listVault, saveVaultPost } from "@/lib/vault/vault-fns";
import type { VaultCursor, VaultEntry, VaultFilter, VaultPage, VaultSummary } from "@/lib/vault/types";
import type { ExtractResult } from "@/lib/extract/types";
import { DashboardButton, DashboardFilterMenu } from "./block/dashboard-shell";

type VaultProps = {
  account: string;
  revision: number;
  refresh: () => void;
  onOpen: (entry: VaultEntry) => void;
  onCopy: (item: ExtractResult) => void;
  onShare: (item: ExtractResult) => void;
};

export function PastepostVault({ account, revision, refresh, onOpen, onCopy, onShare }: VaultProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VaultFilter>("all");
  const [page, setPage] = useState<VaultPage<VaultSummary>>({ items: [], next: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [browserArchive] = useState(loadBrowserArchive);
  const [browserImported, setBrowserImported] = useState(false);
  const [review, setReview] = useState<{ entries: VaultEntry[]; skipped: number; browser?: boolean }>();
  const [importSummary, setImportSummary] = useState("");
  const [opening, setOpening] = useState("");
  const requestNumber = useRef(0);

  useEffect(() => {
    const request = ++requestNumber.current;
    let canceled = false;
    setLoading(true);
    setError("");
    const timer = window.setTimeout(async () => {
      try {
        const response = await listVault({ data: { expectedAccount: account, filter, query } });
        if (!canceled && request === requestNumber.current) setPage(response);
      } catch {
        if (!canceled && request === requestNumber.current) setError("Couldn’t load your Vault.");
      } finally {
        if (!canceled && request === requestNumber.current) setLoading(false);
      }
    }, query ? 200 : 0);
    return () => {
      canceled = true;
      window.clearTimeout(timer);
    };
  }, [account, filter, query, revision]);

  async function loadMore() {
    if (!page.next || loading) return;
    const request = ++requestNumber.current;
    setLoading(true);
    try {
      const extra = await listVault({ data: { expectedAccount: account, filter, query, cursor: page.next } });
      if (request === requestNumber.current) setPage({ items: [...page.items, ...extra.items], next: extra.next });
    } catch {
      if (request === requestNumber.current) toast.error("Couldn’t load more posts.");
    } finally {
      if (request === requestNumber.current) setLoading(false);
    }
  }

  async function read(id: string, action: (entry: VaultEntry) => void) {
    if (opening) return;
    setOpening(id);
    try {
      const entry = await getVaultPost({ data: { expectedAccount: account, id } });
      if (!entry) throw new Error();
      action(entry);
    } catch { toast.error("Couldn’t open that post. Try again."); }
    finally { setOpening(""); }
  }

  async function change(id: string, action: "favorite" | "trash", value: boolean) {
    try {
      if (!await changeVaultPost({ data: { expectedAccount: account, id, action, value } })) throw new Error();
      setPage((old) => ({ ...old, items: old.items.flatMap((item) => {
        if (item.id !== id) return [item];
        if (action === "trash" || (filter === "favorites" && !value)) return [];
        return [{ ...item, favorite: value }];
      }) }));
      if (action === "trash") toast.success(value ? "Moved to Trash" : "Restored to Vault");
    } catch { toast.error("Couldn’t update this post. Try again."); }
  }

  async function* entries() {
    let cursor: VaultCursor | undefined;
    do {
      const next = await exportVaultPage({ data: { expectedAccount: account, cursor } });
      yield* next.items;
      cursor = next.next ?? undefined;
    } while (cursor);
  }

  async function exportAll() {
    setBusy("export");
    try {
      const { blob, count } = await buildVaultZip(entries());
      if (!count) { toast.info("Your Vault is empty"); return; }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "pastepost-vault.zip";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success(`Exported ${count} ${count === 1 ? "post" : "posts"}`);
    } catch { toast.error("Couldn’t export your Vault. Try again."); }
    finally { setBusy(null); }
  }

  async function selectZip(file: File) {
    setBusy("import");
    setImportSummary("");
    try {
      const preview = readVaultZip(new Uint8Array(await file.arrayBuffer()));
      if (!preview.entries.length) { toast.error("No PastePost posts were found in this ZIP."); return; }
      setReview(preview);
    } catch (error) {
      toast.error(error instanceof Error && error.message.startsWith("This ") ? error.message : "Couldn’t read that ZIP.");
    } finally { setBusy(null); }
  }

  async function importReviewed() {
    if (!review) return;
    setBusy("import");
    let added = 0;
    let existing = 0;
    const failed: VaultEntry[] = [];
    for (const entry of review.entries) {
      try {
        const result = await saveVaultPost({ data: { expectedAccount: account, entry } });
        if (result.added) added++;
        else existing++;
      } catch { failed.push(entry); }
    }
    setImportSummary(`Imported ${added} · Already in Vault ${existing} · Skipped ${review.skipped} · Failed ${failed.length}`);
    setReview(failed.length ? { ...review, entries: failed, skipped: 0 } : undefined);
    if (review.browser && !failed.length) setBrowserImported(true);
    setBusy(null);
    refresh();
  }

  return <section className="vault-view">
    <div className="vault-heading"><div><h2>Your Markdown Vault</h2></div></div>
    <div className="vault-tools">
      <DashboardButton variant="secondary" size="sm" disabled={busy !== null} onClick={() => void exportAll()}>
        <Download size={16} />{busy === "export" ? "Exporting…" : "Export entire Vault"}
      </DashboardButton>
      <DashboardButton variant="secondary" size="sm" disabled={busy !== null || Boolean(review)}
        onClick={() => document.getElementById("pastepost-backup-input")?.click()}>Import ZIP</DashboardButton>
      <input type="file" id="pastepost-backup-input" hidden accept=".zip,application/zip" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void selectZip(file);
        event.target.value = "";
      }} />
      {browserArchive.length > 0 && !browserImported && <DashboardButton variant="secondary" size="sm"
        disabled={busy !== null || Boolean(review)} onClick={() => {
          setImportSummary("");
          setReview({ entries: browserArchive, skipped: 0, browser: true });
        }}>Recover from this browser</DashboardButton>}
    </div>
    {review && <div className="vault-recovery">
      <p>Merge {review.entries.length} {review.entries.length === 1 ? "post" : "posts"} into this account?
        {review.skipped > 0 && ` ${review.skipped} entries will be skipped.`}</p>
      <div className="vault-tools">
        <DashboardButton variant="primary" size="sm" disabled={busy !== null} onClick={() => void importReviewed()}>
          {busy === "import" ? "Importing…" : "Merge posts"}
        </DashboardButton>
        <DashboardButton variant="secondary" size="sm" disabled={busy !== null} onClick={() => setReview(undefined)}>Cancel</DashboardButton>
      </div>
    </div>}
    {importSummary && <p role="status">{importSummary}</p>}
    <label className="search-input"><Search size={16} />
      <input aria-label="Search the Vault" placeholder="Search title, author, or post type…"
        value={query} maxLength={200} onChange={(event) => setQuery(event.target.value)} />
    </label>
    <div className="filter-row"><DashboardFilterMenu label="Show" value={filter} options={[
      { value: "all", label: "All" }, { value: "favorites", label: "Favorites" }, { value: "trash", label: "Trash" },
    ]} onValueChange={(value) => setFilter(value as VaultFilter)} /></div>
    {error ? <p className="error-card" role="alert">{error} <button type="button" onClick={refresh}>Try again</button></p> :
      loading && !page.items.length ? <p role="status">Loading your Vault…</p> :
      page.items.length ? <div className="vault-list" aria-busy={loading}>
        {page.items.map((item) => <article className="vault-card" key={item.id}>
          <button type="button" className="vault-main" disabled={loading || !!opening} onClick={() => void read(item.id, onOpen)}>
            <span className="file-type">.{item.kind}</span>
            <span className="vault-title"><b>{item.title}</b><small>@{item.author.handle}
              {item.extractedAt !== 0 && ` · ${new Date(item.extractedAt).toLocaleDateString()}`}</small></span>
          </button>
          <div className="vault-actions">
            <DashboardButton variant="secondary" size="sm" disabled={!!opening}
              onClick={() => void read(item.id, ({ result }) => onCopy(result))}><Copy size={14} />Copy</DashboardButton>
            <DashboardButton variant="ghost" size="icon" aria-label={item.favorite ? "Remove favorite" : "Favorite"}
              aria-pressed={item.favorite} onClick={() => void change(item.id, "favorite", !item.favorite)}>
              <Bookmark size={16} fill={item.favorite ? "currentColor" : "none"} />
            </DashboardButton>
            <DashboardButton variant="ghost" size="icon" aria-label="Share Markdown" disabled={!!opening}
              onClick={() => void read(item.id, ({ result }) => onShare(result))}><Share2 size={16} /></DashboardButton>
            <DashboardButton variant="ghost" size="icon" aria-label={item.trashed ? "Restore post" : "Move to Trash"}
              onClick={() => void change(item.id, "trash", !item.trashed)}>{item.trashed ? <RotateCcw size={16} /> : <Trash2 size={16} />}</DashboardButton>
          </div>
        </article>)}
        {page.next && <DashboardButton variant="secondary" size="sm" disabled={loading}
          onClick={() => void loadMore()}>{loading ? "Loading…" : "Load more"}</DashboardButton>}
      </div> : <div className="empty-vault"><FolderOpen size={24} /><h3>{filter === "trash" ? "Trash is empty" :
        query ? "No matching posts" : filter === "favorites" ? "No favorites yet" : "Extract a post to start your Vault"}</h3></div>}
  </section>;
}
