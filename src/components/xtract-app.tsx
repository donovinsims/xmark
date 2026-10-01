import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  LoaderCircle,
  Settings,
  Share2,
  Type,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Drawer } from "vaul";
import { extractPost } from "@/lib/extract/extract-fn";
import {
  findCached,
  loadHistory,
  loadSettings,
  saveSettings,
  upsertHistory,
} from "@/lib/extract/history";
import {
  downloadFilename,
  resultFromPaste,
} from "@/lib/extract/markdown";
import { parseInput } from "@/lib/extract/parse";
import { MarkdownView } from "@/lib/extract/render-markdown";
import type { ExtractError, ExtractResult, PostBody } from "@/lib/extract/types";
import {
  isSandboxPreviewGuestHost,
  resolveCurrentEmbedderOrigin,
} from "@/lib/preview-host-bridge";

type Status = "idle" | "loading" | "success" | "error" | "paste";
type ReaderView = "reader" | "raw";

/**
 * Grok's iOS preview paints native close / more below the status bar.
 * Overlay is the remaining distance to the bottom of that row so we
 * never stack a second header under it. Standalone and Safari stay 0.
 */
function useGrokPreviewOverlay() {
  useEffect(() => {
    const root = document.documentElement;

    const probeInset = () => {
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;visibility:hidden;pointer-events:none;height:env(safe-area-inset-top,0px)";
      root.appendChild(probe);
      const inset = probe.getBoundingClientRect().height;
      probe.remove();
      return inset;
    };

    const grokReferrer = () => {
      try {
        const ref = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "";
        return ref === "grok.com" || ref.endsWith(".grok.com");
      } catch {
        return false;
      }
    };

    const apply = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      const automated = Boolean(navigator.webdriver);
      const isiOS =
        /iP(hone|ad|od)/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const embedder = resolveCurrentEmbedderOrigin();
      const guest = isSandboxPreviewGuestHost(window.location.hostname);
      const framed = window.parent !== window;
      const fromGrok = Boolean(embedder || guest || framed || grokReferrer());

      if (standalone || automated || !isiOS || !fromGrok) {
        root.removeAttribute("data-grok-preview");
        root.style.setProperty("--preview-overlay-top", "0px");
        return;
      }

      root.setAttribute("data-grok-preview", "");
      const inset = probeInset();
      // Visual bottom of Grok's X / more row, including the status bar.
      const clearance = 120;
      const overlay = Math.max(0, Math.round(clearance - inset));
      root.style.setProperty("--preview-overlay-top", `${overlay}px`);
    };

    apply();
    window.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("resize", apply);
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("resize", apply);
      mq.removeEventListener?.("change", apply);
    };
  }, []);
}

function useKeyboardInset() {
  useEffect(() => {
    const sync = () => {
      const vv = window.visualViewport;
      if (!vv) {
        document.documentElement.style.setProperty("--keyboard-inset", "0px");
        return;
      }
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
    };
    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);
}

function useSheetLock(open: boolean) {
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.setAttribute("data-sheet-open", "");
    else root.removeAttribute("data-sheet-open");
    return () => root.removeAttribute("data-sheet-open");
  }, [open]);
}

export function XtractApp() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<ExtractError | null>(null);
  const [view, setView] = useState<ReaderView>("reader");
  const [history, setHistory] = useState<ExtractResult[]>([]);
  const [bearerToken, setBearerToken] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useGrokPreviewOverlay();
  useKeyboardInset();

  useEffect(() => {
    setHistory(loadHistory());
    setBearerToken(loadSettings().bearerToken);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSettings({ bearerToken });
  }, [bearerToken, hydrated]);

  const canExtract = input.trim().length > 0 && status !== "loading";
  const composerInvalid =
    status === "error" && (error?.code === "invalid" || error?.code === "empty");
  const readerOpen = Boolean(result) && status === "success";
  const pasteOpen = status === "paste";
  useSheetLock(pasteOpen || settingsOpen || readerOpen);

  const closeReader = useCallback(() => {
    setStatus((current) => (current === "success" ? "idle" : current));
  }, []);

  async function runExtract(raw = input, force = false) {
    const parsed = parseInput(raw);
    if (!parsed.ok) {
      setError({
        code: parsed.reason === "empty" ? "empty" : "invalid",
        message:
          parsed.reason === "empty"
            ? "Paste an X URL or a numeric status ID."
            : "That doesn’t look like an X URL or status ID.",
        tried: [],
      });
      setStatus("error");
      setShakeKey((key) => key + 1);
      return;
    }

    if (!force) {
      const cached = findCached(history, parsed.id);
      if (cached) {
        setResult(cached);
        setError(null);
        setStatus("success");
        setView("reader");
        toast.success("Loaded from cache");
        return;
      }
    }

    setStatus("loading");
    setError(null);
    try {
      const response = await extractPost({
        data: {
          input: raw,
          bearerToken: bearerToken.trim() || undefined,
        },
      });
      if (response.ok) {
        setResult(response.result);
        setHistory(upsertHistory(history, response.result));
        setStatus("success");
        setView("reader");
      } else {
        setError(response.error);
        setStatus("error");
      }
    } catch {
      setError({
        code: "network",
        message: "Couldn’t reach this post. Try again, or paste the text.",
        tried: [],
      });
      setStatus("error");
    }
  }

  function applyPaste() {
    const parsed = parseInput(input);
    const next = resultFromPaste({
      text: pasteText,
      parsedId: parsed.ok ? parsed.id : undefined,
      parsedHandle: parsed.ok ? parsed.handle : undefined,
      canonical: parsed.ok ? parsed.canonical : undefined,
    });
    setResult(next);
    setHistory(upsertHistory(history, next));
    setStatus("success");
    setView("reader");
    setError(null);
    toast.success("Formatted pasted text");
  }

  async function copyMarkdown() {
    if (!result) return false;
    const ok = await writeClipboard(result.markdown);
    toast[ok ? "success" : "error"](ok ? "Markdown copied" : "Couldn’t copy");
    return ok;
  }

  function downloadMd() {
    if (!result) return;
    const name = downloadFilename(result.author.handle, result.id);
    const blob = new Blob([result.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Saved ${name}`);
  }

  async function shareResult() {
    if (!result) return;
    const title = result.title || `Post by @${result.author.handle}`;
    const text = result.markdown;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text });
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
    const ok = await writeClipboard(text);
    toast[ok ? "success" : "error"](ok ? "Markdown copied" : "Couldn’t share");
  }

  function loadItem(item: ExtractResult) {
    setResult(item);
    setInput(item.permalink || item.id);
    setStatus("success");
    setView("reader");
    setError(null);
  }

  function onComposerChange(value: string) {
    setInput(value);
    if (status === "error") {
      setError(null);
      setStatus("idle");
    }
  }

  function clearHistory() {
    setHistory([]);
    if (typeof window !== "undefined") window.localStorage.removeItem("xtract.history");
    toast.success("History cleared");
  }

  return (
    <div className="app-shell">
      <div className="fiducial-chrome" aria-hidden="true">
        <span className="fiducial-rail fiducial-rail-l" />
        <span className="fiducial-rail fiducial-rail-r" />
        <span className="fiducial-mark fiducial-mark-tl" />
        <span className="fiducial-mark fiducial-mark-tr" />
      </div>
      <div aria-hidden={readerOpen || undefined} className={readerOpen ? "is-covered" : undefined}>
      <header className="nav-bar justify-between gutter-x">
        <h1 className="nav-title truncate">Xtract</h1>
        <button
          type="button"
          className="icon-hit"
          aria-label="Settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="size-5" strokeWidth={1.75} />
        </button>
      </header>

      <main className="app-main gutter-x safe-bottom">
        {history.length === 0 && status !== "error" ? <HomeEmpty /> : null}

        <Composer
          value={input}
          onChange={onComposerChange}
          onSubmit={() => void runExtract(input, true)}
          loading={status === "loading"}
          disabled={!canExtract}
          invalid={composerInvalid}
          shakeKey={shakeKey}
          textareaRef={textareaRef}
        />

        {status === "loading" ? <ExtractStatus /> : null}

        {error && status === "error" ? (
          <ErrorPanel
            error={error}
            onPaste={() => setStatus("paste")}
            onSignIn={() => {
              setSettingsOpen(true);
              setAdvancedOpen(true);
            }}
            onRetry={() => void runExtract(input, true)}
          />
        ) : null}

        {history.length ? (
          <HomeHistory items={history} onSelect={loadItem} onClear={clearHistory} />
        ) : null}
      </main>
      </div>

      <ReaderScreen
        open={readerOpen}
        onBack={closeReader}
        result={result}
        view={view}
        onView={setView}
        onRefresh={() => void runExtract(input, true)}
        onCopyMarkdown={() => copyMarkdown()}
        onShare={() => shareResult()}
        onDownload={downloadMd}
      />

      <PasteSheet
        open={pasteOpen}
        onOpenChange={(open) => {
          if (!open) setStatus(error ? "error" : "idle");
        }}
        value={pasteText}
        onChange={setPasteText}
        onFormat={applyPaste}
      />

      <SettingsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        bearerToken={bearerToken}
        onBearerToken={setBearerToken}
        advancedOpen={advancedOpen}
        onAdvancedOpen={setAdvancedOpen}
        signedIn={Boolean(bearerToken.trim())}
        onRetry={
          error
            ? () => {
                setSettingsOpen(false);
                void runExtract(input, true);
              }
            : undefined
        }
      />
    </div>
  );
}

function SheetFrame({
  open,
  onOpenChange,
  dismissible = true,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dismissible?: boolean;
  children: ReactNode;
}) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
      dismissible={dismissible}
      repositionInputs
    >
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-scrim fixed inset-0" />
        <Drawer.Content className="sheet-surface fixed inset-x-0 bottom-0 flex flex-col outline-none">
          <div className="sheet-grabber" />
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  loading,
  disabled,
  invalid,
  shakeKey,
  textareaRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled: boolean;
  invalid: boolean;
  shakeKey: number;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const box = boxRef.current;
    if (!wrap || !box) return;
    if (!invalid) {
      wrap.classList.remove("is-error");
      box.classList.remove("is-error", "is-shaking");
      return;
    }
    wrap.classList.add("is-error");
    box.classList.add("is-error");
    box.classList.remove("is-shaking");
    void box.offsetWidth;
    box.classList.add("is-shaking");
    const cs = getComputedStyle(document.documentElement);
    const ms = (name: string, fallback: number) => {
      const parsed = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const shakeMs = ms("--shake-dur-a", 80) * 2 + ms("--shake-dur-b", 60) * 2;
    const timer = window.setTimeout(() => box.classList.remove("is-shaking"), shakeMs + 20);
    return () => window.clearTimeout(timer);
  }, [invalid, shakeKey]);

  return (
    <div className="t-input-wrap" ref={wrapRef}>
      <div ref={boxRef} className="t-input rounded-prompt bg-surface-1 p-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              if (!disabled) onSubmit();
            }
          }}
          rows={3}
          placeholder="Paste a link or ID"
          aria-label="X URL or status ID"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          className="block w-full resize-none bg-transparent text-body text-text-primary outline-none placeholder:text-text-secondary"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-caption text-text-tertiary">Public posts only</span>
          <div className="flex items-center">
            {value.trim() ? (
              <button
                type="button"
                className="icon-hit"
                aria-label="Clear"
                onClick={() => onChange("")}
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            ) : null}
            <button
              type="button"
              className="send-hit"
              aria-label="Extract"
              aria-busy={loading}
              disabled={disabled}
              onClick={onSubmit}
            >
              <span className="send-btn" aria-hidden="true">
                <span className="t-icon-swap" data-state={loading ? "b" : "a"}>
                  <span className="t-icon" data-icon="a">
                    <ArrowUp className="size-4" strokeWidth={2.5} />
                  </span>
                  <span className="t-icon" data-icon="b">
                    <LoaderCircle className="size-4 animate-spin" strokeWidth={2.5} />
                  </span>
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({
  error,
  onPaste,
  onSignIn,
  onRetry,
}: {
  error: ExtractError;
  onPaste: () => void;
  onSignIn: () => void;
  onRetry: () => void;
}) {
  const network = error.code === "network";
  return (
    <section className="mt-5">
      <p className="text-body text-error">{error.message}</p>
      {error.tried.length ? (
        <p className="mt-2 text-caption text-text-tertiary">Tried {error.tried.join(" → ")}</p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2">
        {network ? (
          <>
            <button type="button" className="btn-primary w-full" onClick={onRetry}>
              Try again
            </button>
            <button type="button" className="btn-ghost w-full" onClick={onPaste}>
              Paste text instead
            </button>
            <button type="button" className="btn-ghost w-full" onClick={onSignIn}>
              Sign in with X
            </button>
          </>
        ) : error.code === "gone" || error.code === "private" ? (
          <button type="button" className="btn-ghost w-full" onClick={onPaste}>
            Paste text instead
          </button>
        ) : (
          <button type="button" className="btn-ghost w-full" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </section>
  );
}

function ReaderScreen({
  open,
  onBack,
  result,
  view,
  onView,
  onRefresh,
  onCopyMarkdown,
  onShare,
  onDownload,
}: {
  open: boolean;
  onBack: () => void;
  result: ExtractResult | null;
  view: ReaderView;
  onView: (view: ReaderView) => void;
  onRefresh: () => void;
  onCopyMarkdown: () => Promise<boolean>;
  onShare: () => Promise<void>;
  onDownload: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ xtractReader: 1 }, "");
    const onPop = () => onBack();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, [open, onBack]);

  if (!open || !result) return null;

  function back() {
    if (window.history.state && window.history.state.xtractReader) {
      window.history.back();
      return;
    }
    onBack();
  }

  return (
    <section className="stack-screen" aria-label={`Extracted ${result.kind}`}>
      <header className="nav-bar gutter-x">
        <button type="button" className="nav-back" onClick={back}>
          ‹ Xtract
        </button>
        <h2 className="sheet-bar-title min-w-0">@{result.author.handle}</h2>
        <button type="button" className="nav-text sheet-bar-trailing" onClick={onRefresh}>
          Refresh
        </button>
      </header>
      <div className="stack-body gutter-x">
        <div className="reader-tabs">
          <div className="t-tabs-wrap">
            <Segmented view={view} onView={onView} />
          </div>
        </div>
        {view === "raw" ? (
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-well bg-fill p-4 font-mono text-meta text-text-primary">
            {result.markdown}
          </pre>
        ) : (
          <article>
            <p className="reader-byline">
              {result.author.name}
              {result.date ? ` · ${formatWhen(result.date, true)}` : ""}
              {" · "}
              <a href={result.permalink} target="_blank" rel="noreferrer" className="link-blue">
                Source
              </a>
            </p>
            <div className="reader-doc">
              {result.kind === "article" && result.posts[0]?.article ? (
                <div className="reader-body">
                  <MarkdownView
                    markdown={[
                      `# ${result.posts[0].article.title}`,
                      "",
                      result.posts[0].article.markdown,
                    ].join("\n")}
                  />
                </div>
              ) : (
                result.posts.map((post, index) => (
                  <div key={post.id}>
                    {result.posts.length > 1 ? (
                      <>
                        {index > 0 ? <hr className="my-5 border-divider" /> : null}
                        <p className="mb-3 text-caption font-medium text-text-secondary">
                          Post {index + 1} of {result.posts.length}
                        </p>
                      </>
                    ) : null}
                    <PostView post={post} />
                  </div>
                ))
              )}
            </div>
          </article>
        )}
      </div>
      <div className="sheet-footer">
        <ReaderActions
          onCopyMarkdown={onCopyMarkdown}
          onShare={onShare}
          onDownload={onDownload}
        />
      </div>
    </section>
  );
}

function PasteSheet({
  open,
  onOpenChange,
  value,
  onChange,
  onFormat,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  onFormat: () => void;
}) {
  return (
    <SheetFrame open={open} onOpenChange={onOpenChange}>
      <div className="sheet-head">
        <Drawer.Title className="text-section font-bold">Paste text</Drawer.Title>
        <button type="button" className="nav-text" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
      </div>
      <Drawer.Description className="sr-only">
        Paste the public post text to format as Markdown
      </Drawer.Description>
      <div className="sheet-body gutter-x pb-4">
        <p className="text-meta text-text-secondary">
          Xtract will format what you paste. It will not invent missing text.
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          placeholder="Paste the public post text"
          data-vaul-no-drag=""
          className="mt-3 w-full rounded-well bg-fill p-3 text-body text-text-primary outline-none placeholder:text-text-secondary"
        />
      </div>
      <div className="sheet-footer">
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!value.trim()}
          onClick={onFormat}
        >
          Format
        </button>
      </div>
    </SheetFrame>
  );
}

function SwapLabel({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(text);

  useEffect(() => {
    const el = ref.current;
    if (!el || prev.current === text) return;
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--text-swap-dur");
    const dur = parseFloat(raw) || 150;
    el.classList.add("is-exit");
    const timer = window.setTimeout(() => {
      el.textContent = text;
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      void el.offsetHeight;
      el.classList.remove("is-enter-start");
    }, dur);
    prev.current = text;
    return () => window.clearTimeout(timer);
  }, [text]);

  return (
    <span className="t-text-swap" ref={ref}>
      {text}
    </span>
  );
}

function ReaderActions({
  onCopyMarkdown,
  onShare,
  onDownload,
}: {
  onCopyMarkdown: () => Promise<boolean>;
  onShare: () => Promise<void>;
  onDownload: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);

  return (
    <div className="reader-toolbar">
      {canShare ? (
        <button
          type="button"
          className="btn-ghost"
          aria-label="Share Markdown"
          onClick={() => void onShare()}
        >
          <Share2 className="size-4" strokeWidth={2} />
        </button>
      ) : null}
      <button
        type="button"
        className="btn-primary min-w-0 flex-1 gap-2"
        aria-label="Copy Markdown"
        onClick={async () => {
          if (await onCopyMarkdown()) setCopied(true);
        }}
      >
        {copied ? (
          <Check className="size-4 shrink-0" strokeWidth={2.4} />
        ) : (
          <Copy className="size-4 shrink-0" strokeWidth={2} />
        )}
        <span className="truncate">
          <SwapLabel text={copied ? "Copied" : "Copy"} />
        </span>
      </button>
      <button
        type="button"
        className="btn-ghost"
        aria-label="Download Markdown"
        onClick={onDownload}
      >
        <Download className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}

function PostView({ post }: { post: PostBody }) {
  return (
    <div className="reader-body text-body">
      {post.text ? <MarkdownView markdown={post.text} /> : null}
      {post.quote ? (
        <blockquote className="mt-4">
          <p>{post.quote.text}</p>
          <p className="mt-2 text-meta">
            — {post.quote.name} (@{post.quote.handle}),{" "}
            <a href={post.quote.permalink} className="link-blue" target="_blank" rel="noreferrer">
              source
            </a>
          </p>
        </blockquote>
      ) : null}
      {post.article ? (
        <div className="mt-4">
          <MarkdownView markdown={`# ${post.article.title}\n\n${post.article.markdown}`} />
        </div>
      ) : null}
      {post.media.length ? (
        <div className="mt-3 flex flex-col gap-3">
          {post.media.map((item, i) =>
            item.kind === "image" ? (
              <img key={i} src={item.url} alt={item.alt} />
            ) : (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="link-blue text-button font-semibold"
              >
                {item.label}
              </a>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

function Counts({ post }: { post: PostBody }) {
  const parts = [
    formatCount(post.likes, "likes"),
    formatCount(post.reposts, "reposts"),
    formatCount(post.replies, "replies"),
    formatCount(post.quotes, "quotes"),
    formatCount(post.views, "views"),
  ].filter(Boolean);
  if (!parts.length) return null;
  return <p className="mt-2 text-meta text-text-secondary">{parts.join(" · ")}</p>;
}

function Segmented({
  view,
  onView,
}: {
  view: ReaderView;
  onView: (view: ReaderView) => void;
}) {
  const pillRef = useRef<HTMLSpanElement>(null);
  const readerRef = useRef<HTMLButtonElement>(null);
  const rawRef = useRef<HTMLButtonElement>(null);
  const firstPaint = useRef(true);

  const moveTo = (tab: HTMLButtonElement | null, animate: boolean) => {
    const pill = pillRef.current;
    if (!tab || !pill) return;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
      return;
    }
    pill.style.transform = `translateX(${tab.offsetLeft}px)`;
    pill.style.width = `${tab.offsetWidth}px`;
  };

  useEffect(() => {
    const active = view === "reader" ? readerRef.current : rawRef.current;
    const animate = !firstPaint.current;
    firstPaint.current = false;
    const id = requestAnimationFrame(() => moveTo(active, animate));
    const onResize = () => moveTo(view === "reader" ? readerRef.current : rawRef.current, false);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
  }, [view]);

  return (
    <div className="t-tabs" role="tablist" aria-label="Reader mode">
      <span className="t-tabs-pill" aria-hidden="true" ref={pillRef} />
      <button
        ref={readerRef}
        type="button"
        role="tab"
        aria-selected={view === "reader"}
        className="t-tab"
        onClick={(e) => {
          moveTo(e.currentTarget, true);
          onView("reader");
        }}
      >
        <Type className="size-3.5" strokeWidth={2} />
        Reading
      </button>
      <button
        ref={rawRef}
        type="button"
        role="tab"
        aria-selected={view === "raw"}
        className="t-tab"
        onClick={(e) => {
          moveTo(e.currentTarget, true);
          onView("raw");
        }}
      >
        <FileText className="size-3.5" strokeWidth={2} />
        Markdown
      </button>
    </div>
  );
}

function HomeHistory({
  items,
  onSelect,
  onClear,
}: {
  items: ExtractResult[];
  onSelect: (item: ExtractResult) => void;
  onClear: () => void;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  if (!items.length) return <HomeEmpty />;
  return (
    <section className="mt-8">
      <div className="section-head">
        <h2 className="section-label">Recents</h2>
        <button
          type="button"
          className="nav-text nav-text-destructive"
          onClick={() => {
            if (!confirmClear) {
              setConfirmClear(true);
              return;
            }
            onClear();
            setConfirmClear(false);
          }}
        >
          {confirmClear ? "Clear All" : "Clear"}
        </button>
      </div>
      {confirmClear ? (
        <p className="px-4 pb-2 text-meta text-text-secondary">
          Removes every extract on this device. This cannot be undone.
        </p>
      ) : null}
      <HistoryRows items={items} onSelect={onSelect} />
    </section>
  );
}

function HistoryRows({
  items,
  onSelect,
}: {
  items: ExtractResult[];
  onSelect: (item: ExtractResult) => void;
}) {
  return (
    <ul className="grouped">
      {items.map((item) => (
        <li key={`${item.id}-${item.extractedAt}`}>
          <button type="button" onClick={() => onSelect(item)} className="row-push">
            <span className="min-w-0 flex-1">
              <span className="block text-history font-semibold">{item.title}</span>
              <span className="mt-1 block text-meta text-text-secondary">
                @{item.author.handle}
                {item.date ? ` · ${formatWhen(item.date, true)}` : ""}
                {` · ${item.kind}`}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-text-tertiary" strokeWidth={2} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function SettingsDrawer({
  open,
  onOpenChange,
  bearerToken,
  onBearerToken,
  advancedOpen,
  onAdvancedOpen,
  signedIn,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bearerToken: string;
  onBearerToken: (value: string) => void;
  advancedOpen: boolean;
  onAdvancedOpen: (open: boolean) => void;
  signedIn: boolean;
  onRetry?: () => void;
}) {
  const [draft, setDraft] = useState(bearerToken);
  useEffect(() => {
    if (open) setDraft(bearerToken);
  }, [open, bearerToken]);

  const dirty = draft.trim() !== bearerToken.trim();

  function close(next: boolean) {
    if (!next && dirty) return;
    onOpenChange(next);
  }

  function save() {
    onBearerToken(draft.trim());
    toast.success(draft.trim() ? "X session saved" : "X session cleared");
    onRetry?.();
    onOpenChange(false);
  }

  return (
    <SheetFrame open={open} onOpenChange={close} dismissible={!dirty}>
      <div className="sheet-head">
        <Drawer.Title className="text-section font-bold">Settings</Drawer.Title>
        <button
          type="button"
          className="nav-text"
          onClick={() => {
            setDraft(bearerToken);
            onOpenChange(false);
          }}
        >
          {dirty ? "Cancel" : "Done"}
        </button>
      </div>
      <Drawer.Description className="sr-only">
        Optional X session and install notes
      </Drawer.Description>
      <div className="sheet-body gutter-x pb-4">
        <p className="text-body text-text-secondary">
          Public sources first. Sign in only if they fail.
        </p>
        <div className="grouped mt-4">
          <div className="group-row">
            <div>
              <p className="text-history">X session</p>
              <p className="mt-0.5 text-meta text-text-secondary">
                {signedIn ? "Saved on this device." : "Not connected."}
              </p>
            </div>
            {signedIn ? (
              <span className="flex items-center gap-1 text-caption font-semibold text-success">
                <Check className="size-3.5" strokeWidth={2.5} />
                On
              </span>
            ) : (
              <span className="text-caption text-text-tertiary">Off</span>
            )}
          </div>
        </div>
        <p className="footnote">The token never leaves this device except to call X after public sources fail.</p>
        <div className="grouped mt-6">
          <label className="group-row !flex-col !items-stretch !gap-2" htmlFor="x-bearer">
            <span className="text-history">Sign in with X</span>
            <input
              id="x-bearer"
              type="password"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Bearer token"
              data-vaul-no-drag=""
              className="h-11 w-full rounded-control bg-fill px-3 text-body text-text-primary outline-none placeholder:text-text-secondary"
            />
          </label>
        </div>

        <div className="t-acc mt-6" data-open={advancedOpen ? "true" : "false"}>
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between px-1 text-meta font-normal text-text-secondary"
            aria-expanded={advancedOpen}
            onClick={() => onAdvancedOpen(!advancedOpen)}
          >
            Advanced
            <span className="t-acc-chevron" aria-hidden="true">
              <ChevronDown className="size-4" strokeWidth={2} />
            </span>
          </button>
          <div className="t-acc-panel">
            <div className="t-acc-panel-inner">
              <p className="footnote pb-2">Optional. Public extracts do not need a token.</p>
            </div>
          </div>
        </div>

        <InstallHint />
      </div>
      <div className="sheet-footer">
        <button type="button" className="btn-primary w-full" onClick={save}>
          {onRetry && draft.trim() ? "Save and retry" : "Save"}
        </button>
      </div>
    </SheetFrame>
  );
}

function HomeEmpty() {
  return (
    <section className="t-stagger t-stagger-auto mt-3 mb-4">
      <h2 className="t-stagger-line t-stagger-line--1 text-screen-title font-bold text-balance">
        Paste a public post.
      </h2>
      <p className="t-stagger-line t-stagger-line--2 mt-2 max-w-prose text-history font-normal text-text-secondary">
        Xtract returns the thread as Markdown.
      </p>
    </section>
  );
}

const THINK_STATES = ["Reading the post…", "Unrolling thread…", "Formatting Markdown…"];

function ExtractStatus() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "exit" | "enter">("in");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cs = getComputedStyle(document.documentElement);
    const hold = parseFloat(cs.getPropertyValue("--think-hold")) || 2000;
    const swap = parseFloat(cs.getPropertyValue("--think-swap")) || 150;
    const gap = parseFloat(cs.getPropertyValue("--think-gap")) || 50;
    let holdTimer = 0;
    let swapTimer = 0;
    let enterTimer = 0;

    const loop = () => {
      holdTimer = window.setTimeout(() => {
        if (reduced) {
          setIndex((i) => (i + 1) % THINK_STATES.length);
          loop();
          return;
        }
        setPhase("exit");
        swapTimer = window.setTimeout(() => {
          setIndex((i) => (i + 1) % THINK_STATES.length);
          setPhase("enter");
          enterTimer = window.setTimeout(() => {
            setPhase("in");
            loop();
          }, Math.max(gap, 16));
        }, swap);
      }, hold);
    };

    loop();
    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(swapTimer);
      window.clearTimeout(enterTimer);
    };
  }, []);

  const text = THINK_STATES[index];
  const phaseClass =
    phase === "exit" ? " is-exit" : phase === "enter" ? " is-enter-start" : "";

  return (
    <p className="mt-3 text-meta" role="status">
      <span className="t-think">
        <span className="t-think-sizer" aria-hidden="true">
          Formatting Markdown…
        </span>
        <span className={`t-think-text${phaseClass}`} data-text={text}>
          {text}
        </span>
      </span>
    </p>
  );
}

function InstallHint() {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setStandalone(standaloneMode);
  }, []);
  if (standalone) return null;
  return <p className="mt-8 footnote">Share → Add to Home Screen.</p>;
}

function formatWhen(iso: string, short = false): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: short ? undefined : "short",
  });
}

function formatCount(value: number | undefined, label: string): string | null {
  if (value == null) return null;
  return `${value.toLocaleString("en-US")} ${label}`;
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
