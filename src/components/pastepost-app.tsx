import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArrowUp, Bookmark, Check, ChevronLeft, ClipboardPaste, Copy, Download, FileCode2, FileText, FolderOpen, Link, LoaderCircle, Moon, RefreshCw, Search, Send, Settings, Share2, Sun, Trash2, X } from "lucide-react";
import { strToU8, zipSync } from "fflate";
import { toast } from "sonner";
import { extractPost } from "@/lib/extract/extract-fn";
import { downloadFilename, resultFromPaste } from "@/lib/extract/markdown";
import { parseInput } from "@/lib/extract/parse";
import { MarkdownView } from "@/lib/extract/render-markdown";
import { findCached, loadHistory, loadSettings, saveHistory, saveSettings, toggleSaved, upsertHistory } from "@/lib/extract/history";
import type { ExtractError, ExtractResult, PostBody } from "@/lib/extract/types";

type AppView = "extract" | "vault" | "settings";
type ReaderMode = "preview" | "markdown" | "yaml";
type Theme = "dark" | "light";
const THEME_KEY = "pastepost.theme";
const LEGACY_THEME_KEY = "xtract.theme";

export function PastepostApp() {
  const [appView, setAppView] = useState<AppView>("extract");
  const [theme, setTheme] = useState<Theme>("dark");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<ExtractError | null>(null);
  const [history, setHistory] = useState<ExtractResult[]>([]);
  const [bearerToken, setBearerToken] = useState("");
  const [readerMode, setReaderMode] = useState<ReaderMode>("preview");
  const [readerOpen, setReaderOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [clearOpen, setClearOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "saved">("all");
  const [hydrated, setHydrated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const readerHistoryRef = useRef(false);

  useEffect(() => {
    setHistory(loadHistory());
    setBearerToken(loadSettings().bearerToken);
    const stored = window.localStorage.getItem(THEME_KEY) ?? window.localStorage.getItem(LEGACY_THEME_KEY);
    if (stored === "light" || stored === "dark") setTheme(stored);
    setHydrated(true);
  }, []);
  useEffect(() => { if (!hydrated) return; document.documentElement.classList.toggle("dark", theme === "dark"); document.documentElement.style.colorScheme = theme; window.localStorage.setItem(THEME_KEY, theme); }, [hydrated, theme]);
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
  const filteredHistory = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return history.filter((item) => (filter !== "saved" || item.saved) && (!needle || [item.title, item.author.name, item.author.handle, item.kind].join(" ").toLowerCase().includes(needle)));
  }, [filter, history, query]);

  async function runExtract(raw = input, force = false) {
    const parsed = parseInput(raw);
    if (!parsed.ok) {
      setError({ code: parsed.reason === "empty" ? "empty" : "invalid", message: parsed.reason === "empty" ? "Paste an X URL or status ID." : "That doesn’t look like an X URL or status ID.", tried: [] });
      setStatus("error"); return;
    }
    if (!force) {
      const cached = findCached(history, parsed.id);
      if (cached) { openResult(cached); toast.success("Opened from your Vault"); return; }
    }
    setStatus("loading"); setError(null);
    try {
      const response = await extractPost({ data: { input: raw, bearerToken: bearerToken.trim() || undefined } });
      if (!response.ok) { setError(response.error); setStatus("error"); return; }
      const next = upsertHistory(history, response.result);
      setHistory(next); setResult(response.result); setReaderMode("preview"); setReaderOpen(true); setStatus("idle");
    } catch { setError({ code: "network", message: "Couldn’t reach this post. Try again, or paste the text.", tried: [] }); setStatus("error"); }
  }
  function openResult(item: ExtractResult) { setResult(item); setInput(item.permalink || item.id); setReaderMode("preview"); setReaderOpen(true); setError(null); setStatus("idle"); }
  function formatPaste() {
    const parsed = parseInput(input);
    const next = resultFromPaste({ text: pasteText, parsedId: parsed.ok ? parsed.id : undefined, parsedHandle: parsed.ok ? parsed.handle : undefined, canonical: parsed.ok ? parsed.canonical : undefined });
    setHistory(upsertHistory(history, next)); setResult(next); setReaderMode("preview"); setPasteOpen(false); setReaderOpen(true); setStatus("idle"); setError(null); toast.success("Text formatted as Markdown");
  }
  async function copyText(text: string, success = "Copied to clipboard") { try { await navigator.clipboard.writeText(text); toast.success(success); } catch { toast.error("Couldn’t copy to clipboard"); } }
  function downloadResult(item: ExtractResult) { downloadBlob(item.markdown, downloadFilename(item.author.handle, item.id), "text/markdown;charset=utf-8"); toast.success("Markdown download started"); }
  async function shareResult(item: ExtractResult) { try { if (navigator.share) { await navigator.share({ title: item.title || `Post by @${item.author.handle}`, text: item.markdown }); return; } } catch (error) { if (error instanceof Error && error.name === "AbortError") return; } await copyText(item.markdown, "Markdown copied to share"); }
  function exportVault() { if (!history.length) return; const archive = zipSync(Object.fromEntries(history.map((item) => [downloadFilename(item.author.handle, item.id), strToU8(item.markdown)]))); downloadBlob(archive, "pastepost-vault.zip", "application/zip"); toast.success(`Exported ${history.length} ${history.length === 1 ? "file" : "files"}`); }
  function clearHistory() { setHistory([]); saveHistory([]); setClearOpen(false); toast.success("Vault cleared"); }
  function closeReader() {
    if (readerHistoryRef.current && window.history.state?.pastepostReader) window.history.back();
    else setReaderOpen(false);
  }
  const updateSaved = (id: string) => setHistory((items) => toggleSaved(items, id));

  return <div className="coss-app">
    <TopBar view={appView} theme={theme} onTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")} onSettings={() => setAppView("settings")} />
    <main className="coss-main">
      {appView === "extract" && <ExtractView input={input} setInput={(value) => { setInput(value); if (status === "error") { setStatus("idle"); setError(null); } }} inputRef={inputRef} canExtract={canExtract} loading={status === "loading"} error={status === "error" ? error : null} onExtract={() => void runExtract(input)} onPaste={() => setPasteOpen(true)} onRetry={() => void runExtract(input, true)} onSettings={() => setAppView("settings")} recent={history.slice(0, 3)} onOpen={openResult} />}
      {appView === "vault" && <VaultView items={filteredHistory} allCount={history.length} query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} onOpen={openResult} onToggleSaved={updateSaved} onCopy={(item) => void copyText(item.markdown, "Markdown copied")} onShare={(item) => void shareResult(item)} onExport={exportVault} onClear={() => setClearOpen(true)} />}
      {appView === "settings" && <SettingsView theme={theme} onTheme={setTheme} bearerToken={bearerToken} onToken={setBearerToken} onClear={() => setClearOpen(true)} hasHistory={history.length > 0} />}
    </main>
    <BottomNav view={appView} onChange={setAppView} />
    {readerOpen && result && <ReaderOverlay result={result} mode={readerMode} onMode={setReaderMode} onClose={closeReader} onRefresh={() => void runExtract(input, true)} onCopy={() => void copyText(readerMode === "yaml" ? metadataYaml(result) : result.markdown, readerMode === "yaml" ? "YAML copied" : "Markdown copied")} onDownload={() => downloadResult(result)} onShare={() => void shareResult(result)} onToggleSaved={() => setHistory((items) => { const next = toggleSaved(items, result.id); setResult(next.find((item) => item.id === result.id) ?? result); return next; })} />}
    {pasteOpen && <Dialog title="Paste text" onClose={() => setPasteOpen(false)}><p className="dialog-copy">Paste the post or thread text. pastepost will format it locally into a readable document.</p><textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} autoFocus placeholder="Paste post text…" className="coss-textarea" rows={8} /><button type="button" className="button-primary w-full" disabled={!pasteText.trim()} onClick={formatPaste}><FileText size={16} /> Format as Markdown</button></Dialog>}
    {clearOpen && <Dialog title="Clear Vault?" onClose={() => setClearOpen(false)}><p className="dialog-copy">This removes all locally saved extracts and bookmarks from this device.</p><div className="dialog-actions"><button type="button" className="button-secondary" onClick={() => setClearOpen(false)}>Cancel</button><button type="button" className="button-danger" onClick={clearHistory}>Clear Vault</button></div></Dialog>}
  </div>;
}

function TopBar({ view, theme, onTheme, onSettings }: { view: AppView; theme: Theme; onTheme: () => void; onSettings: () => void }) { const title = view === "extract" ? "pastepost" : view === "vault" ? "Vault" : "Settings"; return <header className="coss-topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark" /><h1>{title}</h1>{view === "extract" && <span className="version-badge">v2.4</span>}</div><div className="topbar-actions"><button className="theme-toggle" type="button" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={onTheme}>{theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}</button><button className="icon-button" type="button" aria-label="Settings" onClick={onSettings}><Settings size={17} /></button></div></div></header>; }
function ExtractView({ input, setInput, inputRef, canExtract, loading, error, onExtract, onPaste, onRetry, onSettings, recent, onOpen }: { input: string; setInput: (value: string) => void; inputRef: React.RefObject<HTMLInputElement | null>; canExtract: boolean; loading: boolean; error: ExtractError | null; onExtract: () => void; onPaste: () => void; onRetry: () => void; onSettings: () => void; recent: ExtractResult[]; onOpen: (item: ExtractResult) => void; }) { return <section className="extract-view"><div className="extract-intro"><p className="eyebrow">PUBLIC X TO MARKDOWN</p><h2>Make every post<br />portable.</h2><p>Extract a public post, thread, or article into clean Markdown.</p></div><div className="composer-card"><label className="url-input"><Link size={17} /><input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && canExtract) onExtract(); }} placeholder="Paste X link, thread, or article…" aria-label="X URL" />{input && <button type="button" onClick={() => { setInput(""); inputRef.current?.focus(); }} aria-label="Clear input"><X size={15} /></button>}</label><div className="composer-actions"><button type="button" className="button-primary" disabled={!canExtract} onClick={onExtract}>{loading ? <LoaderCircle className="spin" size={17} /> : <ArrowUp size={17} />}{loading ? "Extracting" : "Extract"}</button><button type="button" className="button-secondary" onClick={onPaste}><ClipboardPaste size={16} />Paste & Run</button></div><p className="composer-note"><Check size={13} />Public posts only <span>•</span> Markdown-ready</p></div>{loading && <div className="status-line"><LoaderCircle className="spin" size={14} />Fetching and formatting your extract…</div>}{error && <div className="error-card"><p>{error.message}</p>{error.tried.length > 0 && <small>Tried {error.tried.join(" → ")}</small>}<div><button type="button" className="button-primary" onClick={onRetry}><RefreshCw size={15} />Try again</button><button type="button" className="button-secondary" onClick={onSettings}>Connection settings</button></div></div>}{recent.length > 0 && <section className="recent-block"><div className="section-head"><h3>Recently extracted</h3><span>{recent.length} files</span></div><div className="mini-list">{recent.map((item) => <button type="button" className="mini-row" key={item.id} onClick={() => onOpen(item)}><span className="file-type">.{kindLabel(item.kind)}</span><span><b>{item.title}</b><small>@{item.author.handle} · {formatWhen(item.extractedAt)}</small></span><ChevronLeft className="row-chevron" size={17} /></button>)}</div></section>}</section>; }
function VaultView({ items, allCount, query, filter, onQuery, onFilter, onOpen, onToggleSaved, onCopy, onShare, onExport, onClear }: { items: ExtractResult[]; allCount: number; query: string; filter: "all" | "saved"; onQuery: (query: string) => void; onFilter: (filter: "all" | "saved") => void; onOpen: (item: ExtractResult) => void; onToggleSaved: (id: string) => void; onCopy: (item: ExtractResult) => void; onShare: (item: ExtractResult) => void; onExport: () => void; onClear: () => void; }) { return <section className="vault-view"><div className="vault-heading"><div><p className="eyebrow">LOCAL LIBRARY</p><h2>Your Markdown Vault</h2></div>{allCount > 0 && <button className="icon-button" aria-label="Clear Vault" type="button" onClick={onClear}><Trash2 size={16} /></button>}</div><label className="search-input"><Search size={16} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search threads, articles, tags…" /><span>{items.length}</span></label><div className="filter-row"><button className={filter === "all" ? "filter active" : "filter"} type="button" onClick={() => onFilter("all")}>All</button><button className={filter === "saved" ? "filter active" : "filter"} type="button" onClick={() => onFilter("saved")}>Saved</button></div>{items.length ? <div className="vault-list">{items.map((item) => <article className="vault-card" key={item.id}><button type="button" className="vault-main" onClick={() => onOpen(item)}><span className="file-type">.{kindLabel(item.kind)}</span><span className="vault-title"><b>{item.title}</b><small>@{item.author.handle} · {formatWhen(item.extractedAt)}</small></span></button><div className="vault-actions"><button type="button" className="copy-button" onClick={() => onCopy(item)}><Copy size={14} />Copy</button><button type="button" className={item.saved ? "saved-button is-saved" : "saved-button"} aria-label={item.saved ? "Remove from Saved" : "Save to Vault"} onClick={() => onToggleSaved(item.id)}><Bookmark size={16} fill={item.saved ? "currentColor" : "none"} /></button><button type="button" className="saved-button" aria-label="Share Markdown" onClick={() => onShare(item)}><Share2 size={16} /></button></div></article>)}</div> : <div className="empty-vault"><FolderOpen size={25} /><h3>{allCount ? "No matching records" : "Your Vault is empty"}</h3><p>{allCount ? "Try a different search or filter." : "Extract a public X post to create your first Markdown file."}</p></div>}{allCount > 0 && <div className="vault-dock"><button type="button" className="button-primary" onClick={onExport}><Archive size={17} />Export All (.zip)</button><span>{allCount} {allCount === 1 ? "file" : "files"}</span></div>}</section>; }
function SettingsView({ theme, onTheme, bearerToken, onToken, onClear, hasHistory }: { theme: Theme; onTheme: (theme: Theme) => void; bearerToken: string; onToken: (token: string) => void; onClear: () => void; hasHistory: boolean; }) { return <section className="settings-view"><p className="eyebrow">PREFERENCES</p><h2>Settings</h2><div className="settings-card"><div><b>Appearance</b><small>Stored on this device</small></div><div className="mode-switch"><button className={theme === "light" ? "active" : ""} type="button" onClick={() => onTheme("light")}><Sun size={14} />Light</button><button className={theme === "dark" ? "active" : ""} type="button" onClick={() => onTheme("dark")}><Moon size={14} />Dark</button></div></div><div className="settings-card stacked"><div><b>X session token</b><small>Optional. Only used if public sources fail.</small></div><input type="password" value={bearerToken} onChange={(event) => onToken(event.target.value)} placeholder="Paste a bearer token" autoComplete="off" /></div><p className="settings-footnote">Your token stays on this device except when it is used to request an X post after public sources fail.</p><div className="settings-card danger-zone"><div><b>Local Vault</b><small>Remove saved extracts and bookmarks from this device.</small></div><button type="button" className="button-danger" disabled={!hasHistory} onClick={onClear}><Trash2 size={15} />Clear Vault</button></div></section>; }
function ReaderOverlay({ result, mode, onMode, onClose, onRefresh, onCopy, onDownload, onShare, onToggleSaved }: { result: ExtractResult; mode: ReaderMode; onMode: (mode: ReaderMode) => void; onClose: () => void; onRefresh: () => void; onCopy: () => void; onDownload: () => void; onShare: () => void; onToggleSaved: () => void; }) { return <section className="reader-overlay" aria-label="Extract reader"><header className="reader-topbar"><button type="button" className="back-button" onClick={onClose}><ChevronLeft size={17} />Vault</button><p>{result.title}</p><div><button className="icon-button" type="button" aria-label="Refresh extract" onClick={onRefresh}><RefreshCw size={16} /></button><button className={result.saved ? "icon-button saved-active" : "icon-button"} type="button" aria-label="Save extract" onClick={onToggleSaved}><Bookmark size={16} fill={result.saved ? "currentColor" : "none"} /></button></div></header><div className="reader-content"><div className="reader-tabs" role="tablist"><Tab active={mode === "preview"} onClick={() => onMode("preview")} icon={<FileText size={14} />}>Preview</Tab><Tab active={mode === "markdown"} onClick={() => onMode("markdown")} icon={<FileCode2 size={14} />}>Markdown</Tab><Tab active={mode === "yaml"} onClick={() => onMode("yaml")} icon={<FileCode2 size={14} />}>YAML</Tab></div>{mode === "preview" ? <article className="reader-document"><p className="reader-meta"><span className="file-type">.{kindLabel(result.kind)}</span>@{result.author.handle}<a href={result.permalink} target="_blank" rel="noreferrer">View on X ↗</a></p><h2>{result.title}</h2>{result.posts.map((post, index) => <div key={post.id} className="post-block">{index > 0 && <hr />}{result.posts.length > 1 && <p className="post-number">POST {index + 1} OF {result.posts.length}</p>}<PostView post={post} /></div>)}</article> : <pre className="code-pane">{mode === "markdown" ? result.markdown : metadataYaml(result)}</pre>}</div><footer className="reader-dock"><button type="button" className="button-primary" onClick={onCopy}><Copy size={16} />Copy {mode === "yaml" ? "YAML" : "Markdown"}</button><button type="button" className="icon-button" aria-label="Download Markdown" onClick={onDownload}><Download size={17} /></button><button type="button" className="icon-button" aria-label="Share Markdown" onClick={onShare}><Share2 size={17} /></button></footer></section>; }
function Tab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: string }) { return <button role="tab" aria-selected={active} className={active ? "active" : ""} type="button" onClick={onClick}>{icon}{children}</button>; }
function BottomNav({ view, onChange }: { view: AppView; onChange: (view: AppView) => void }) { return <nav className="bottom-nav" aria-label="Main navigation"><button className={view === "extract" ? "active" : ""} onClick={() => onChange("extract")} type="button"><Send size={18} /><span>Extract</span></button><button className={view === "vault" ? "active" : ""} onClick={() => onChange("vault")} type="button"><FolderOpen size={18} /><span>Vault</span></button><button className={view === "settings" ? "active" : ""} onClick={() => onChange("settings")} type="button"><Settings size={18} /><span>Settings</span></button></nav>; }
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="dialog-backdrop" role="presentation"><section className="dialog-card" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={17} /></button></header>{children}</section></div>; }
function PostView({ post }: { post: PostBody }) { return <div className="post-content"><p>{post.text}</p>{post.article && <MarkdownView markdown={post.article.markdown} />}{post.quote && <blockquote><p>{post.quote.text}</p><a href={post.quote.permalink} target="_blank" rel="noreferrer">@{post.quote.handle} ↗</a></blockquote>}{post.media.length > 0 && <p className="media-note">{post.media.length} attachment{post.media.length > 1 ? "s" : ""}</p>}</div>; }
function kindLabel(kind: ExtractResult["kind"]) { return kind === "article" ? "article" : kind === "thread" ? "thread" : "post"; }
function formatWhen(timestamp: number) { const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000)); if (seconds < 60) return "just now"; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function metadataYaml(result: ExtractResult) { return ["---", `title: ${JSON.stringify(result.title)}`, `author: ${JSON.stringify(`@${result.author.handle}`)}`, `source: ${JSON.stringify(result.permalink)}`, `type: ${result.kind}`, `extracted_at: ${new Date(result.extractedAt).toISOString()}`, "---"].join("\n"); }
function downloadBlob(contents: BlobPart, filename: string, type: string) { const blob = new Blob([contents], { type }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }
