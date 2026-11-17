import { loadDrafts, readLocal, writeLocal, readLinkDraft } from "@/lib/extract/browser-state";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Bookmark, Check, ChevronLeft, Copy, Download, FileCode2, FileText, FolderOpen, Link, List, LoaderCircle, Moon, RefreshCw, Send, Settings, Share2, Sun, X } from "lucide-react";
import { strToU8, zipSync } from "fflate";
import { toast } from "sonner";
import { DashboardButton } from "./block/dashboard-shell";
import { PastepostAccount } from "./pastepost-account";
import { PastepostVault } from "./pastepost-vault";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState, type AppUser } from "@/lib/auth/use-current-user";
import { extractPost } from "@/lib/extract/extract-fn";
import { bodyTextFromMarkdown, downloadFilename } from "@/lib/extract/markdown";
import { parseInput, parseMany } from "@/lib/extract/parse";
import { MarkdownView } from "@/lib/extract/render-markdown";
import { loadSettings, saveSettings } from "@/lib/extract/history";
import { useArchive } from "@/lib/vault/use-archive";
import { changeVaultPost, getVaultPost } from "@/lib/vault/vault-fns";
import type { VaultEntry } from "@/lib/vault/types";
import type { ExtractError, ExtractResult, PostBody } from "@/lib/extract/types";

type AppView = "extract" | "vault" | "settings";
type ReaderMode = "preview" | "markdown" | "yaml";
type Theme = "dark" | "light";
type BulkStatus = "queued" | "running" | "cache" | "done" | "error" | "invalid";
type BulkRow = { key: string; token: string; id?: string; label: string; status: BulkStatus; note?: string };
type BulkSectionProps = { text: string; onText: (value: string) => void; rows: BulkRow[]; validCount: number; invalidCount: number; running: boolean; results: ExtractResult[]; open: boolean; collapsed: boolean; onToggle: () => void; onRun: () => void; onStop: () => void; onExportMd: () => void; onExportZip: () => void; onCopyAll: () => void; };
const THEME_KEY = "pastepost.theme";
const LEGACY_THEME_KEY = "xtract.theme";

export function PastepostApp({ sharedUrl }: { sharedUrl?: string }) {
  const { user, isPending } = useCurrentUserState();
  if (!user || user.isDevFallback) return <PastepostAccount pending={isPending} sharedUrl={sharedUrl} />;
  return <SignedInPastepost key={user.id} user={user} sharedUrl={sharedUrl} />;
}

function SignedInPastepost({ user, sharedUrl }: { user: AppUser; sharedUrl?: string }) {
  const { archive, retry, statuses, unsynced, revision, refresh } = useArchive(user.id);
  const [appView, setAppView] = useState<AppView>("extract");
  const [theme, setTheme] = useState<Theme>("dark");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<ExtractError | null>(null);
  const [bearerToken, setBearerToken] = useState("");
  const [readerMode, setReaderMode] = useState<ReaderMode>("preview");
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerFromVault, setReaderFromVault] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [pasting, setPasting] = useState(false);
  const pasteBusy = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const readerHistoryRef = useRef(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<ExtractResult[]>([]);
  const bulkStopRef = useRef(false);
  const consumedSharedUrl = useRef<string | undefined>(undefined);

  useEffect(() => {
    setBearerToken(loadSettings().bearerToken);
    const stored = readLocal(THEME_KEY) ?? readLocal(LEGACY_THEME_KEY);
    if (stored === "light" || stored === "dark") setTheme(stored);
    const drafts = loadDrafts(); setInput(drafts.input); setBulkText(drafts.bulkText);
    setHydrated(true);
  }, []);
  useEffect(() => { if (!hydrated) return; document.documentElement.classList.toggle("dark", theme === "dark"); document.documentElement.style.colorScheme = theme; writeLocal(THEME_KEY, theme); document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#131316" : "#fafafa"); }, [hydrated, theme]);
  useEffect(() => { if (hydrated) writeLocal("pastepost.drafts", JSON.stringify({ input, bulkText })); }, [hydrated, input, bulkText]);
  useEffect(() => { if (hydrated) saveSettings({ bearerToken }); }, [bearerToken, hydrated]);
  useEffect(() => {
    if (!readerOpen) return;
    window.history.pushState({ pastepostReader: true }, "");
    readerHistoryRef.current = true;
    const onPopState = () => { readerHistoryRef.current = false; setReaderOpen(false); };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [readerOpen]);

  const canExtract = input.trim().length > 0 && status !== "loading";
  const readerStatus = result ? (readerFromVault ? "saved" : statuses[result.id]) : undefined;
  const bulkParsed = useMemo(() => parseMany(bulkText), [bulkText]);
  const bulkPreviewRows = useMemo<BulkRow[]>(() => [
    ...bulkParsed.valid.map((item): BulkRow => ({ key: `id:${item.id}`, token: item.raw, id: item.id, label: item.canonical, status: "queued" })),
    ...bulkParsed.invalid.map((token, index): BulkRow => ({ key: `bad:${index}:${token}`, token, label: token, status: "invalid", note: "Not an X URL or status ID" })),
  ], [bulkParsed]);
  const bulkRowsForView = bulkRows.length ? bulkRows.map((row) => {
    if (row.status !== "done" || !row.id) return row;
    const sync = statuses[row.id];
    const note = sync === "saved" ? "Saved to Vault" : sync === "existing" ? "Already in Vault" :
      sync === "pending" || sync === "download" ? "Not synced" : "Saving to Vault…";
    return { ...row, note };
  }) : bulkPreviewRows;

  async function runBulk() {
    if (bulkRunning) return;
    const items = bulkParsed.valid;
    if (!items.length) return;
    bulkStopRef.current = false;
    setBulkRunning(true);
    setBulkResults([]);
    setBulkRows(bulkPreviewRows);
    const results: ExtractResult[] = [];
    const patch = (key: string, status: BulkStatus, note?: string) =>
      setBulkRows((rows) => rows.map((row) => (row.key === key ? { ...row, status, note } : row)));

    for (let index = 0; index < items.length; index += 1) {
      if (bulkStopRef.current) break;
      const item = items[index]!;
      const key = `id:${item.id}`;
      const cached = await findArchived(item.id);
      if (bulkStopRef.current) break;
      if (cached) {
        results.push(cached.result);
        setBulkResults([...results]);
        patch(key, "cache", "Loaded from cache");
        continue;
      }
      patch(key, "running", "Extracting…");
      try {
        const response = await extractPost({ data: { input: item.raw, bearerToken: bearerToken.trim() || undefined } });
        if (!response.ok) {
          patch(key, "error", response.error.message);
        } else {
          archive(response.result);
          results.push(response.result);
          setBulkResults([...results]);
          patch(key, "done", `@${response.result.author.handle}`);
        }
      } catch {
        patch(key, "error", "Couldn’t reach this post.");
      }
      if (!bulkStopRef.current && index < items.length - 1) await sleep(350);
    }
    setBulkRunning(false);
  }

  const bulkMarkdown = () => bulkResults.map((item) => item.markdown).join("\n\n---\n\n");
  function bulkStamp() {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  }
  function exportBulkMarkdown() {
    if (!bulkResults.length) return;
    downloadBlob(bulkMarkdown(), `xtract-bulk-${bulkStamp()}.md`, "text/markdown;charset=utf-8");
    toast.success(`Exported ${bulkResults.length} ${bulkResults.length === 1 ? "file" : "files"}`);
  }
  function exportBulkZip() {
    if (!bulkResults.length) return;
    const archive = zipSync(Object.fromEntries(bulkResults.map((item) => [downloadFilename(item.author.handle, item.id), strToU8(item.markdown)])));
    downloadBlob(archive, `xtract-bulk-${bulkStamp()}.zip`, "application/zip");
    toast.success(`Zipped ${bulkResults.length} ${bulkResults.length === 1 ? "file" : "files"}`);
  }

  async function pasteAndExtract() {
    if (pasteBusy.current || status === "loading" || bulkRunning || !hydrated) return;
    pasteBusy.current = true;
    setPasting(true);
    try {
      // Call directly during the button gesture so iOS can request Paste access.
      const text = await navigator.clipboard.readText();
      setInput(text.trim());
      setBulkOpen(false);
      await runExtract(text.trim());
    } catch {
      setError({ code: "network", message: "Couldn’t read the clipboard. Touch and hold the input, choose Paste, then tap Extract.", tried: [] });
      setStatus("error");
    } finally {
      pasteBusy.current = false;
      setPasting(false);
    }
  }

  const findArchived = useCallback((id: string) => {
    // An unavailable or slow Vault should not stall the X extractor.
    return Promise.race([
      getVaultPost({ data: { expectedAccount: user.id, id } }).catch(() => null),
      sleep(350).then(() => null),
    ]);
  }, [user.id]);

  const openResult = useCallback((item: ExtractResult, fromVault: boolean, fillInput = true) => {
    setResult(item);
    setReaderFromVault(fromVault);
    if (fillInput) setInput(item.permalink || item.id);
    setReaderMode("preview");
    setReaderOpen(true);
    setError(null);
    setStatus("idle");
  }, []);
  const openArchived = useCallback(({ result: item, favorite }: VaultEntry) => {
    openResult({ ...item, saved: favorite }, true);
  }, [openResult]);

  const runExtract = useCallback(async (raw: string, force = false) => {
    const parsed = parseInput(raw);
    if (!parsed.ok) {
      setError({ code: parsed.reason === "empty" ? "empty" : "invalid", message: parsed.reason === "empty" ? "Paste an X URL or status ID." : "That doesn’t look like an X URL or status ID.", tried: [] });
      setStatus("error"); return;
    }
    setStatus("loading"); setError(null);
    if (!force) {
      const cached = await findArchived(parsed.id);
      if (cached) { openArchived(cached); toast.success("Opened from your Vault"); return; }
    }
    try {
      const response = await extractPost({ data: { input: raw, bearerToken: bearerToken.trim() || undefined } });
      if (!response.ok) { setError(response.error); setStatus("error"); return; }
      archive(response.result);
      openResult(response.result, false, false);
    } catch { setError({ code: "network", message: "Couldn’t reach this post. Try again, or paste the text.", tried: [] }); setStatus("error"); }
  }, [archive, bearerToken, findArchived, openArchived, openResult]);
  useEffect(() => {
    if (sharedUrl === undefined) {
      consumedSharedUrl.current = undefined;
      return;
    }
    if (!hydrated || consumedSharedUrl.current === sharedUrl) return;
    consumedSharedUrl.current = sharedUrl;
    const address = new URL(window.location.href);
    address.searchParams.delete("url");
    window.history.replaceState(window.history.state, "", address);
    setAppView("extract");
    setBulkOpen(false);
    setInput(sharedUrl);
    void runExtract(sharedUrl);
  }, [hydrated, sharedUrl, runExtract]);
  async function copyText(text: string, success = "Copied to clipboard") { try { await navigator.clipboard.writeText(text); toast.success(success); } catch { toast.error("Couldn’t copy to clipboard"); } }
  function downloadResult(item: ExtractResult) { downloadBlob(item.markdown, downloadFilename(item.author.handle, item.id), "text/markdown;charset=utf-8"); toast.success("Markdown download started"); }
  async function shareResult(item: ExtractResult) { try { if (navigator.share) { await navigator.share({ title: item.title || `Post by @${item.author.handle}`, text: item.markdown }); return; } } catch (error) { if (error instanceof Error && error.name === "AbortError") return; } await copyText(item.markdown, "Markdown copied to share"); }
  function closeReader() {
    if (readerHistoryRef.current && window.history.state?.pastepostReader) window.history.back();
    else setReaderOpen(false);
  }
  async function favoriteReader() {
    if (!result || (readerStatus !== "saved" && readerStatus !== "existing")) return;
    const { id } = result;
    const value = !result.saved;
    try {
      if (!await changeVaultPost({ data: { expectedAccount: user.id, id, action: "favorite", value } })) throw new Error();
      setResult((previous) => previous?.id === id ? { ...previous, saved: value } : previous);
      refresh();
    } catch { toast.error("Couldn’t update this favorite. Try again."); }
  }

  async function pasteLink() {
    try {
      const before = inputRef.current?.value ?? input;
      const text = await readLinkDraft(before, () => navigator.clipboard.readText());
      if ((inputRef.current?.value ?? input) !== before) return;
      setInput(text); setStatus("idle"); setError(null); inputRef.current?.focus();
      toast.success("Link pasted");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn’t paste link"); }
  }
  return <div className="coss-app obsidian-dashboard-shell">
    <TopBar view={appView} theme={theme} onTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")} onSettings={() => setAppView("settings")} />
    <main className="coss-main">
      {appView === "extract" && <ExtractView onPaste={() => void pasteLink()} input={input} setInput={(value) => { setInput(value); if (status === "error") { setStatus("idle"); setError(null); } }} inputRef={inputRef} canExtract={canExtract} loading={status === "loading"} error={status === "error" ? error : null} onExtract={() => void runExtract(input)} onPasteExtract={() => void pasteAndExtract()} pasteDisabled={!hydrated || pasting || status === "loading" || bulkRunning} pasting={pasting} onRetry={() => void runExtract(input, true)} onSettings={() => setAppView("settings")} bulk={{ text: bulkText, onText: (value) => { setBulkText(value); if (!bulkRunning) setBulkRows([]); }, rows: bulkRowsForView, validCount: bulkParsed.valid.length, invalidCount: bulkParsed.invalid.length, running: bulkRunning, results: bulkResults, open: bulkOpen, collapsed: bulkRows.length > 0 && !bulkRunning && bulkResults.length > 0, onToggle: () => setBulkOpen((value) => !value), onRun: () => void runBulk(), onStop: () => { bulkStopRef.current = true; }, onExportMd: exportBulkMarkdown, onExportZip: exportBulkZip, onCopyAll: () => void copyText(bulkMarkdown(), "All markdown copied") }} />}
      {unsynced.length > 0 && <section className="vault-sync" aria-label="Posts waiting to sync">
        <p role="status">{unsynced.length} {unsynced.length === 1 ? "post is" : "posts are"} not synced.</p>
        <button type="button" onClick={() => void retry()}>Retry saves</button>
        {appView === "vault" && <ul>{unsynced.map(({ result: item }) => <li key={item.id}>
          <button type="button" onClick={() => openResult(item, false)}>{item.title}</button>
        </li>)}</ul>}
      </section>}
      {appView === "vault" && <PastepostVault account={user.id} revision={revision} refresh={refresh}
        onOpen={openArchived} onCopy={(item) => void copyText(item.markdown, "Markdown copied")}
        onShare={(item) => void shareResult(item)} />}
      {appView === "settings" && <SettingsView theme={theme} onTheme={setTheme} bearerToken={bearerToken}
        onToken={setBearerToken} email={user.primaryEmail} />}
    </main>
    <BottomNav view={appView} onChange={setAppView} />
    {readerOpen && result && <ReaderOverlay result={result} backLabel={readerFromVault ? "Vault" : "Extract"} mode={readerMode} onMode={setReaderMode}
      sync={readerStatus} onClose={closeReader} onRefresh={() => void runExtract(input, true)}
      onCopy={() => void copyText(readerMode === "yaml" ? metadataYaml(result) : result.markdown, readerMode === "yaml" ? "YAML copied" : "Markdown copied")}
      onDownload={() => downloadResult(result)} onShare={() => void shareResult(result)}
      onFavorite={() => void favoriteReader()} />}
  </div>;
}

function TopBar({ view, theme, onTheme, onSettings }: { view: AppView; theme: Theme; onTheme: () => void; onSettings: () => void }) { const title = view === "extract" ? "pastepost" : view === "vault" ? "Vault" : "Settings"; return <header className="coss-topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark" /><h1>{title}</h1>{view === "extract" && <span className="version-badge">v2.4</span>}</div><div className="topbar-actions"><DashboardButton variant="ghost" size="icon" type="button" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={onTheme}>{theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}</DashboardButton><DashboardButton variant="ghost" size="icon" type="button" aria-label="Settings" onClick={onSettings}><Settings size={17} /></DashboardButton></div></div></header>; }
function ExtractView({ onPaste, input, setInput, inputRef, canExtract, loading, error, onExtract, onPasteExtract, pasteDisabled, pasting, onRetry, onSettings, bulk }: { onPaste: () => void; input: string; setInput: (value: string) => void; inputRef: React.RefObject<HTMLInputElement | null>; canExtract: boolean; loading: boolean; error: ExtractError | null; onExtract: () => void; onPasteExtract: () => void; pasteDisabled: boolean; pasting: boolean; onRetry: () => void; onSettings: () => void; bulk: BulkSectionProps; }) { return <section className="extract-view"><div className="extract-intro"><p className="eyebrow">PUBLIC X TO MARKDOWN</p><h2>Make every post<br />portable.</h2><p>Extract a public post, thread, or article into clean Markdown.</p></div><div className="composer-card"><label className="url-input"><Link size={17} /><input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && canExtract) onExtract(); }} placeholder="Paste X link, thread, or article…" aria-label="X URL" />{input && <button type="button" onClick={() => { setInput(""); inputRef.current?.focus(); }} aria-label="Clear input"><X size={15} /></button>}</label><div className="composer-actions"><DashboardButton variant="secondary" size="sm" onClick={onPaste} disabled={loading || pasting || !!input.trim()}>Paste link</DashboardButton><DashboardButton variant="primary" size="sm" disabled={!canExtract} onClick={onExtract}>{loading ? <LoaderCircle className="spin" size={17} /> : <ArrowUp size={17} />}{loading ? "Extracting" : "Extract"}</DashboardButton><DashboardButton variant="secondary" size="sm" disabled={bulk.running} aria-expanded={bulk.open} onClick={bulk.onToggle}><List size={16} />{bulk.open ? "Hide bulk" : "Bulk"}</DashboardButton></div><DashboardButton variant="secondary" size="sm" disabled={pasteDisabled} onClick={onPasteExtract}>{pasting ? <LoaderCircle className="spin" size={17} /> : <Copy size={17} />}{pasting ? "Pasting…" : "Paste & Extract"}</DashboardButton><p className="composer-note"><Check size={13} />Public posts only <span>•</span> Markdown-ready</p>{bulk.open && <BulkSection {...bulk} />}</div>{loading && <div className="status-line"><LoaderCircle className="spin" size={14} />Fetching and formatting your extract…</div>}{error && <div className="error-card"><p>{error.message}</p>{error.tried.length > 0 && <small>Tried {error.tried.join(" → ")}</small>}<div><DashboardButton variant="primary" size="sm" onClick={onRetry}><RefreshCw size={15} />Try again</DashboardButton><DashboardButton variant="secondary" size="sm" onClick={onSettings}>Connection settings</DashboardButton></div></div>}</section>; }
function BulkSection({ text, onText, rows, validCount, invalidCount, running, results, collapsed, onRun, onStop, onExportMd, onExportZip, onCopyAll }: BulkSectionProps) {
  const validRows = rows.filter((row) => row.status !== "invalid");
  const finished = validRows.filter((row) => row.status === "cache" || row.status === "done" || row.status === "error").length;
  const runLabel = validCount >= 2 ? `Extract ${validCount}` : "Extract";
  const runFinished = !running && results.length > 0;
  const summary = running ? `${finished} / ${validCount}` : validCount > 0 ? `${validCount} ready${invalidCount ? ` · ${invalidCount} skipped` : ""}` : "Up to 20 links or IDs";
  return <><div className="section-head" style={{ marginTop: 14 }}><h3>Bulk extract</h3><span>{summary}</span></div><textarea className="coss-textarea" rows={4} value={text} onChange={(event) => onText(event.target.value)} placeholder="Paste many X links or status IDs — one per line, or comma separated…" aria-label="Bulk URLs or status IDs" spellCheck={false} />{rows.length > 0 && !collapsed && <div className="mini-list" style={{ maxHeight: 260, overflowY: "auto" }}>{rows.map((row) => <div className="mini-row" key={row.key}><span className="file-type" style={bulkStatusStyle(row.status)}>{bulkStatusTag(row.status)}</span><span><b>{row.label}</b><small>{row.note ?? row.token}</small></span></div>)}</div>}<div className="composer-actions"><DashboardButton variant="primary" size="sm" disabled={running || validCount === 0} onClick={onRun}>{running ? <LoaderCircle className="spin" size={17} /> : <ArrowUp size={17} />}{running ? "Extracting" : runLabel}</DashboardButton>{running && <DashboardButton variant="secondary" size="sm" onClick={onStop}><X size={16} />Stop</DashboardButton>}</div>{runFinished && <><div className="composer-actions"><DashboardButton variant="secondary" size="sm" onClick={onCopyAll}><Copy size={15} />Copy all</DashboardButton><DashboardButton variant="secondary" size="sm" onClick={onExportMd}><Download size={15} />.md</DashboardButton><DashboardButton variant="secondary" size="sm" onClick={onExportZip}><Download size={15} />.zip</DashboardButton></div><p className="composer-note"><Check size={13} />{results.length} extracted this run <span>•</span> ready to export</p></>}</>;
}
function bulkStatusTag(status: BulkStatus) { return status === "running" ? "RUN" : status === "cache" ? "CACHE" : status === "done" ? "DONE" : status === "error" ? "FAIL" : status === "invalid" ? "SKIP" : "QUEUE"; }
function bulkStatusStyle(status: BulkStatus): React.CSSProperties | undefined {
  if (status === "error") return { color: "var(--obsidian-dashboard-shell-danger)", borderColor: "color-mix(in srgb, var(--danger) 45%, transparent)" };
  if (status === "done" || status === "cache") return { color: "var(--obsidian-dashboard-shell-success)", borderColor: "color-mix(in srgb, var(--obsidian-dashboard-shell-success) 45%, transparent)" };
  if (status === "running") return { color: "var(--obsidian-dashboard-shell-foreground)", borderColor: "var(--obsidian-dashboard-shell-border-strong)" };
  return undefined;
}
function SettingsView({ theme, onTheme, bearerToken, onToken, email }: {
  theme: Theme; onTheme: (theme: Theme) => void; bearerToken: string; onToken: (token: string) => void; email: string | null;
}) {
  return <section className="settings-view">
    <h2>Settings</h2>
    <div className="settings-card"><div><b>Your account</b><small>{email}</small></div>
      <DashboardButton variant="secondary" size="sm" onClick={() => void signOut().catch(() => toast.error("Couldn’t sign out. Try again."))}>
        Sign out
      </DashboardButton>
    </div>
    <div className="settings-card"><div><b>Appearance</b><small>Stored on this device</small></div>
      <div className="mode-switch">
        <button className={theme === "light" ? "active" : ""} type="button" onClick={() => onTheme("light")}><Sun size={14} />Light</button>
        <button className={theme === "dark" ? "active" : ""} type="button" onClick={() => onTheme("dark")}><Moon size={14} />Dark</button>
      </div>
    </div>
    <div className="settings-card stacked"><div><b>X session token</b><small>Optional. Only used if public sources fail.</small></div>
      <input type="password" value={bearerToken} onChange={(event) => onToken(event.target.value)} placeholder="Paste a bearer token" autoComplete="off" />
    </div>
    <p className="settings-footnote">Your token stays on this device except when it is used to request an X post after public sources fail.</p>
  </section>;
}
function ReaderOverlay({ result, backLabel, mode, onMode, onClose, onRefresh, onCopy, onDownload, onShare, onFavorite, sync }: { result: ExtractResult; backLabel: string; mode: ReaderMode; onMode: (mode: ReaderMode) => void; onClose: () => void; onRefresh: () => void; onCopy: () => void; onDownload: () => void; onShare: () => void; onFavorite: () => void; sync?: "saving" | "saved" | "existing" | "pending" | "download"; }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    ref.current?.showModal(); document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className="reader-overlay" aria-label="Extract reader" onCancel={(event) => { event.preventDefault(); onClose(); }}><header className="reader-topbar"><DashboardButton variant="secondary" size="sm" className="back-button" aria-label={`Back to ${backLabel}`} onClick={onClose}><ChevronLeft size={17} />{backLabel}</DashboardButton><p>{result.title}</p><div><DashboardButton variant="ghost" size="icon" type="button" aria-label="Refresh extract" onClick={onRefresh}><RefreshCw size={16} /></DashboardButton><DashboardButton variant="ghost" size="icon" className={result.saved ? "is-saved" : undefined} type="button" aria-label={result.saved ? "Remove favorite" : "Favorite"} aria-pressed={!!result.saved} disabled={sync !== "saved" && sync !== "existing"} onClick={onFavorite}><Bookmark size={16} fill={result.saved ? "currentColor" : "none"} /></DashboardButton></div></header><div className="reader-content"><p className="reader-sync" role="status">
    {sync === "saved" ? "Saved to Vault" : sync === "existing" ? "Original copy in Vault" : sync === "pending" ? "Not synced · Will retry" :
      sync === "download" ? "Not synced · Download this Markdown to keep a copy" : "Saving to Vault…"}
    </p><div className="reader-tabs" role="tablist"><Tab active={mode === "preview"} onClick={() => onMode("preview")} icon={<FileText size={14} />}>Preview</Tab><Tab active={mode === "markdown"} onClick={() => onMode("markdown")} icon={<FileCode2 size={14} />}>Markdown</Tab><Tab active={mode === "yaml"} onClick={() => onMode("yaml")} icon={<FileCode2 size={14} />}>YAML</Tab></div>{mode === "preview" ? <article className="reader-document"><p className="reader-meta"><span className="file-type">.{kindLabel(result.kind)}</span>@{result.author.handle}<a href={result.permalink} target="_blank" rel="noreferrer">View on X ↗</a></p><h2>{result.title}</h2>{result.posts.length === 0 && <MarkdownView markdown={bodyTextFromMarkdown(result.markdown)} />}{result.posts.map((post, index) => <div key={post.id} className="post-block">{index > 0 && <hr />}{result.posts.length > 1 && <p className="post-number">POST {index + 1} OF {result.posts.length}</p>}<PostView post={post} /></div>)}</article> : <pre className="code-pane">{mode === "markdown" ? result.markdown : metadataYaml(result)}</pre>}</div><footer className="reader-dock"><DashboardButton variant="primary" size="sm" onClick={onCopy}><Copy size={16} />Copy {mode === "yaml" ? "YAML" : "Markdown"}</DashboardButton><DashboardButton variant="secondary" size="icon" aria-label="Download Markdown" onClick={onDownload}><Download size={17} /></DashboardButton><DashboardButton variant="ghost" size="icon" aria-label="Share Markdown" onClick={onShare}><Share2 size={17} /></DashboardButton></footer></dialog>; }
function Tab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: string }) { return <button role="tab" aria-selected={active} className={active ? "active" : ""} type="button" onClick={onClick}>{icon}{children}</button>; }
function BottomNav({ view, onChange }: { view: AppView; onChange: (view: AppView) => void }) { return <nav className="bottom-nav" aria-label="Main navigation"><button className={view === "extract" ? "active" : ""} onClick={() => onChange("extract")} type="button"><Send size={18} /><span>Extract</span></button><button className={view === "vault" ? "active" : ""} onClick={() => onChange("vault")} type="button"><FolderOpen size={18} /><span>Vault</span></button><button className={view === "settings" ? "active" : ""} onClick={() => onChange("settings")} type="button"><Settings size={18} /><span>Settings</span></button></nav>; }
function PostView({ post }: { post: PostBody }) { return <div className="post-content"><p>{post.text}</p>{post.article && <MarkdownView markdown={post.article.markdown} />}{post.quote && <blockquote><p>{post.quote.text}</p><a href={post.quote.permalink} target="_blank" rel="noreferrer">@{post.quote.handle} ↗</a></blockquote>}{post.media.length > 0 && <p className="media-note">{post.media.length} attachment{post.media.length > 1 ? "s" : ""}</p>}</div>; }
function kindLabel(kind: ExtractResult["kind"]) { return kind === "article" ? "article" : kind === "thread" ? "thread" : "post"; }
function metadataYaml(result: ExtractResult) { return ["---", `title: ${JSON.stringify(result.title)}`, `author: ${JSON.stringify(`@${result.author.handle}`)}`, `source: ${JSON.stringify(result.permalink)}`, `type: ${result.kind}`, `extracted_at: ${new Date(result.extractedAt).toISOString()}`, "---"].join("\n"); }
function downloadBlob(contents: BlobPart, filename: string, type: string) { const blob = new Blob([contents], { type }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 60_000); }
function sleep(ms: number) { return new Promise<void>((resolve) => setTimeout(resolve, ms)); }
