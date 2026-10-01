import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { i as string, r as object } from "../_libs/zod.mjs";
import { a as Settings, c as Download, d as ChevronDown, f as Check, i as Share2, l as Copy, n as Type, o as LoaderCircle, p as ArrowUp, s as FileText, t as X, u as ChevronRight } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as resolveCurrentEmbedderOrigin, r as isSandboxPreviewGuestHost } from "./router-JIzJTlos.mjs";
import { a as resultFromPaste, i as parseInput, n as downloadFilename } from "./parse-B7ZVtpjg.mjs";
import { t as Drawer } from "../_libs/vaul.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-B5cuR6Bk.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var InputSchema = object({
	input: string(),
	bearerToken: string().optional()
});
var extractPost = createServerFn({ method: "POST" }).validator((data) => InputSchema.parse(data)).handler(createSsrRpc("6cac98b4ea8c319f032ad98b0524f32dc646fbbe40724d217f3d12349e1297fe"));
var HISTORY_KEY = "xtract.history";
var SETTINGS_KEY = "xtract.settings";
var MAX = 20;
function loadHistory() {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(HISTORY_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
	} catch {
		return [];
	}
}
function saveHistory(items) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX)));
}
function upsertHistory(items, result) {
	const next = [result, ...items.filter((item) => item.id !== result.id)].slice(0, MAX);
	saveHistory(next);
	return next;
}
function findCached(items, id) {
	return items.find((item) => item.id === id);
}
function loadSettings() {
	if (typeof window === "undefined") return { bearerToken: "" };
	try {
		const raw = window.localStorage.getItem(SETTINGS_KEY);
		if (!raw) return { bearerToken: "" };
		return { bearerToken: JSON.parse(raw).bearerToken ?? "" };
	} catch {
		return { bearerToken: "" };
	}
}
function saveSettings(settings) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
function MarkdownView({ markdown }) {
	const blocks = splitBlocks(markdown);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "reader-body text-body text-text-primary",
		children: blocks.map((block, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Fragment, { children: renderBlock(block) }, i))
	});
}
function renderBlock(block) {
	if (block === "---") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("hr", {});
	if (block.startsWith("# ")) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: inline(block.slice(2)) });
	if (block.startsWith("## ")) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: inline(block.slice(3)) });
	if (block.startsWith("### ")) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: inline(block.slice(4)) });
	if (block.startsWith("```")) {
		const body = block.replace(/^```[^\n]*\n?/, "").replace(/```$/, "");
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "overflow-x-auto rounded-well bg-fill p-3 font-mono text-meta",
			children: body
		});
	}
	if (block.startsWith(">")) {
		const text = block.split("\n").map((line) => line.replace(/^>\s?/, "")).join("\n");
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", { children: inline(text) });
	}
	if (/^[-*]\s/.test(block) || /^\d+\.\s/.test(block.split("\n")[0] ?? "")) {
		const items = block.split("\n").filter(Boolean);
		const List = /^\d+\.\s/.test(items[0] ?? "") ? "ol" : "ul";
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, { children: items.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: inline(item.replace(/^([-*]|\d+\.)\s+/, "")) }, i)) });
	}
	const imageOnly = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
	if (imageOnly) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: imageOnly[2],
		alt: imageOnly[1] || "Image"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: inline(block) });
}
function inline(text) {
	const parts = [];
	const re = /(!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
	let last = 0;
	let match;
	let key = 0;
	while (match = re.exec(text)) {
		if (match.index > last) parts.push(text.slice(last, match.index));
		if (match[1]?.startsWith("![")) parts.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: match[3],
			alt: match[2] || "Image"
		}, key++));
		else if (match[4] != null) parts.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
			href: match[5],
			target: "_blank",
			rel: "noreferrer",
			className: "link-blue",
			children: match[4]
		}, key++));
		else if (match[6] != null) parts.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: match[6] }, key++));
		else if (match[7] != null) parts.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: match[7] }, key++));
		else if (match[8] != null) parts.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
			className: "font-mono text-meta",
			children: match[8]
		}, key++));
		last = match.index + match[0].length;
	}
	if (last < text.length) parts.push(text.slice(last));
	return parts;
}
function splitBlocks(markdown) {
	const lines = markdown.replace(/\r\n/g, "\n").split("\n");
	const blocks = [];
	let buf = [];
	let inCode = false;
	let inQuote = false;
	let inList = false;
	const flush = () => {
		if (buf.length) {
			blocks.push(buf.join("\n").trimEnd());
			buf = [];
		}
		inQuote = false;
		inList = false;
	};
	for (const line of lines) {
		if (line.startsWith("```")) {
			if (inCode) {
				buf.push(line);
				flush();
				inCode = false;
			} else {
				flush();
				inCode = true;
				buf.push(line);
			}
			continue;
		}
		if (inCode) {
			buf.push(line);
			continue;
		}
		if (line.trim() === "---") {
			flush();
			blocks.push("---");
			continue;
		}
		if (line.startsWith(">")) {
			if (!inQuote) flush();
			inQuote = true;
			buf.push(line);
			continue;
		}
		if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
			if (!inList) flush();
			inList = true;
			buf.push(line);
			continue;
		}
		if (line.trim() === "") {
			flush();
			continue;
		}
		if (inQuote || inList) flush();
		buf.push(line);
	}
	flush();
	return blocks.filter((b) => b.length);
}
/**
* Grok's iOS preview paints native close / more on the webview.
* Only that host gets --preview-overlay-top. Standalone, Safari,
* desktop iframe, and automated browsers stay at 0.
*/
function useGrokPreviewOverlay() {
	(0, import_react.useEffect)(() => {
		const root = document.documentElement;
		const probeInset = () => {
			const probe = document.createElement("div");
			probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;height:env(safe-area-inset-top,0px)";
			root.appendChild(probe);
			const inset = probe.getBoundingClientRect().height;
			probe.remove();
			return inset;
		};
		const apply = () => {
			const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean(navigator.standalone);
			const automated = Boolean(navigator.webdriver);
			if (standalone || automated) {
				root.style.setProperty("--preview-overlay-top", "0px");
				return;
			}
			const isiOS = /iP(hone|ad|od)/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
			const embedder = resolveCurrentEmbedderOrigin();
			const guest = isSandboxPreviewGuestHost(window.location.hostname);
			const screenH = window.screen.height || 0;
			const innerH = window.innerHeight || 0;
			const fullBleed = screenH > 0 && innerH / screenH >= .92;
			const inset = probeInset();
			const grokIos = isiOS && fullBleed && inset < 12 && Boolean(embedder || guest);
			root.style.setProperty("--preview-overlay-top", grokIos ? "110px" : "0px");
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
	(0, import_react.useEffect)(() => {
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
function useSheetLock(open) {
	(0, import_react.useEffect)(() => {
		const root = document.documentElement;
		if (open) root.setAttribute("data-sheet-open", "");
		else root.removeAttribute("data-sheet-open");
		return () => root.removeAttribute("data-sheet-open");
	}, [open]);
}
function XtractApp() {
	const [input, setInput] = (0, import_react.useState)("");
	const [status, setStatus] = (0, import_react.useState)("idle");
	const [result, setResult] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [view, setView] = (0, import_react.useState)("reader");
	const [history, setHistory] = (0, import_react.useState)([]);
	const [bearerToken, setBearerToken] = (0, import_react.useState)("");
	const [settingsOpen, setSettingsOpen] = (0, import_react.useState)(false);
	const [advancedOpen, setAdvancedOpen] = (0, import_react.useState)(false);
	const [pasteText, setPasteText] = (0, import_react.useState)("");
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	const [shakeKey, setShakeKey] = (0, import_react.useState)(0);
	const textareaRef = (0, import_react.useRef)(null);
	useGrokPreviewOverlay();
	useKeyboardInset();
	(0, import_react.useEffect)(() => {
		setHistory(loadHistory());
		setBearerToken(loadSettings().bearerToken);
		setHydrated(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!hydrated) return;
		saveSettings({ bearerToken });
	}, [bearerToken, hydrated]);
	const canExtract = input.trim().length > 0 && status !== "loading";
	const composerInvalid = status === "error" && (error?.code === "invalid" || error?.code === "empty");
	const readerOpen = Boolean(result) && status === "success";
	const pasteOpen = status === "paste";
	useSheetLock(pasteOpen || settingsOpen || readerOpen);
	const closeReader = (0, import_react.useCallback)(() => {
		setStatus((current) => current === "success" ? "idle" : current);
	}, []);
	async function runExtract(raw = input, force = false) {
		const parsed = parseInput(raw);
		if (!parsed.ok) {
			setError({
				code: parsed.reason === "empty" ? "empty" : "invalid",
				message: parsed.reason === "empty" ? "Paste an X URL or a numeric status ID." : "That doesn’t look like an X URL or status ID.",
				tried: []
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
			const response = await extractPost({ data: {
				input: raw,
				bearerToken: bearerToken.trim() || void 0
			} });
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
				tried: []
			});
			setStatus("error");
		}
	}
	function applyPaste() {
		const parsed = parseInput(input);
		const next = resultFromPaste({
			text: pasteText,
			parsedId: parsed.ok ? parsed.id : void 0,
			parsedHandle: parsed.ok ? parsed.handle : void 0,
			canonical: parsed.ok ? parsed.canonical : void 0
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
				await navigator.share({
					title,
					text
				});
				return;
			}
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") return;
		}
		const ok = await writeClipboard(text);
		toast[ok ? "success" : "error"](ok ? "Markdown copied" : "Couldn’t share");
	}
	function loadItem(item) {
		setResult(item);
		setInput(item.permalink || item.id);
		setStatus("success");
		setView("reader");
		setError(null);
	}
	function onComposerChange(value) {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "app-shell",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				"aria-hidden": readerOpen || void 0,
				className: readerOpen ? "is-covered" : void 0,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "nav-bar justify-between gutter-x",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "truncate text-history font-semibold tracking-[-0.022em]",
						children: "Xtract"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "icon-hit",
						"aria-label": "Settings",
						onClick: () => setSettingsOpen(true),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, {
							className: "size-5",
							strokeWidth: 1.75
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
					className: "app-main gutter-x safe-bottom",
					children: [
						history.length === 0 && status !== "error" && status !== "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomeEmpty, {}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Composer, {
							value: input,
							onChange: onComposerChange,
							onSubmit: () => void runExtract(input, true),
							loading: status === "loading",
							disabled: !canExtract,
							invalid: composerInvalid,
							shakeKey,
							textareaRef
						}),
						status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-meta",
							role: "status",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "t-shimmer",
								"data-text": "Extracting public post…",
								children: "Extracting public post…"
							})
						}) : null,
						error && status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorPanel, {
							error,
							onPaste: () => setStatus("paste"),
							onSignIn: () => {
								setSettingsOpen(true);
								setAdvancedOpen(true);
							},
							onRetry: () => void runExtract(input, true)
						}) : null,
						history.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomeHistory, {
							items: history,
							onSelect: loadItem,
							onClear: clearHistory
						}) : null
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReaderScreen, {
				open: readerOpen,
				onBack: closeReader,
				result,
				view,
				onView: setView,
				onRefresh: () => void runExtract(input, true),
				onCopyMarkdown: () => copyMarkdown(),
				onShare: () => shareResult(),
				onDownload: downloadMd
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PasteSheet, {
				open: pasteOpen,
				onOpenChange: (open) => {
					if (!open) setStatus(error ? "error" : "idle");
				},
				value: pasteText,
				onChange: setPasteText,
				onFormat: applyPaste
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsDrawer, {
				open: settingsOpen,
				onOpenChange: setSettingsOpen,
				bearerToken,
				onBearerToken: setBearerToken,
				advancedOpen,
				onAdvancedOpen: setAdvancedOpen,
				signedIn: Boolean(bearerToken.trim()),
				onRetry: error ? () => {
					setSettingsOpen(false);
					runExtract(input, true);
				} : void 0
			})
		]
	});
}
function SheetFrame({ open, onOpenChange, dismissible = true, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Root, {
		open,
		onOpenChange,
		shouldScaleBackground: false,
		dismissible,
		repositionInputs: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Portal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Overlay, { className: "sheet-scrim fixed inset-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Content, {
			className: "sheet-surface fixed inset-x-0 bottom-0 flex flex-col outline-none",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sheet-grabber" }), children]
		})] })
	});
}
function Composer({ value, onChange, onSubmit, loading, disabled, invalid, shakeKey, textareaRef }) {
	const wrapRef = (0, import_react.useRef)(null);
	const boxRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
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
		box.offsetWidth;
		box.classList.add("is-shaking");
		const cs = getComputedStyle(document.documentElement);
		const ms = (name, fallback) => {
			const parsed = parseFloat(cs.getPropertyValue(name));
			return Number.isFinite(parsed) ? parsed : fallback;
		};
		const shakeMs = ms("--shake-dur-a", 80) * 2 + ms("--shake-dur-b", 60) * 2;
		const timer = window.setTimeout(() => box.classList.remove("is-shaking"), shakeMs + 20);
		return () => window.clearTimeout(timer);
	}, [invalid, shakeKey]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "t-input-wrap",
		ref: wrapRef,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			ref: boxRef,
			className: "t-input rounded-prompt bg-fill p-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
				ref: textareaRef,
				value,
				onChange: (e) => onChange(e.target.value),
				onKeyDown: (e) => {
					if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
						e.preventDefault();
						if (!disabled) onSubmit();
					}
				},
				rows: 3,
				placeholder: "Paste a link or ID",
				"aria-label": "X URL or status ID",
				inputMode: "url",
				autoCapitalize: "none",
				autoCorrect: "off",
				spellCheck: false,
				enterKeyHint: "go",
				className: "block w-full resize-none bg-transparent text-body text-text-primary outline-none placeholder:text-text-secondary"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-caption text-text-tertiary",
					children: "Public posts only"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center",
					children: [value.trim() ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "icon-hit",
						"aria-label": "Clear",
						onClick: () => onChange(""),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
							className: "size-4",
							strokeWidth: 2
						})
					}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "send-hit",
						"aria-label": "Extract",
						"aria-busy": loading,
						disabled,
						onClick: onSubmit,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "send-btn",
							"aria-hidden": "true",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "t-icon-swap",
								"data-state": loading ? "b" : "a",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "t-icon",
									"data-icon": "a",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, {
										className: "size-4",
										strokeWidth: 2.5
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "t-icon",
									"data-icon": "b",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
										className: "size-4 animate-spin",
										strokeWidth: 2.5
									})
								})]
							})
						})
					})]
				})]
			})]
		})
	});
}
function ErrorPanel({ error, onPaste, onSignIn, onRetry }) {
	const network = error.code === "network";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-body text-error",
				children: error.message
			}),
			error.tried.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-caption text-text-tertiary",
				children: ["Tried ", error.tried.join(" → ")]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 flex flex-col gap-2",
				children: network ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn-primary w-full",
						onClick: onRetry,
						children: "Try again"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn-ghost w-full",
						onClick: onPaste,
						children: "Paste text instead"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn-ghost w-full",
						onClick: onSignIn,
						children: "Sign in with X"
					})
				] }) : error.code === "gone" || error.code === "private" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "btn-ghost w-full",
					onClick: onPaste,
					children: "Paste text instead"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "btn-ghost w-full",
					onClick: onRetry,
					children: "Try again"
				})
			})
		]
	});
}
function ReaderScreen({ open, onBack, result, view, onView, onRefresh, onCopyMarkdown, onShare, onDownload }) {
	(0, import_react.useEffect)(() => {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "stack-screen",
		"aria-label": `Extracted ${result.kind}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "nav-bar gutter-x",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "nav-back",
						onClick: back,
						children: "‹ Xtract"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "sheet-bar-title min-w-0",
						children: ["@", result.author.handle]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "nav-text sheet-bar-trailing",
						onClick: onRefresh,
						children: "Refresh"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "stack-body gutter-x",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "t-tabs-wrap",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Segmented, {
						view,
						onView
					})
				}), view === "raw" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-well bg-fill p-4 font-mono text-meta text-text-primary",
					children: result.markdown
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "mt-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-section font-bold",
							children: result.author.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-meta text-text-secondary",
							children: ["@", result.author.handle]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-meta text-text-secondary",
							children: [
								formatWhen(result.date),
								result.date ? " · " : "",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: result.permalink,
									target: "_blank",
									rel: "noreferrer",
									className: "link-blue",
									children: "Permalink"
								})
							]
						}),
						result.posts[0] ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Counts, { post: result.posts[0] }) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-caption text-text-tertiary",
							children: [
								"via ",
								result.source,
								result.kind !== "post" ? ` · ${result.kind}` : ""
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-5",
							children: result.kind === "article" && result.posts[0]?.article ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarkdownView, { markdown: [
								`# ${result.posts[0].article.title}`,
								"",
								result.posts[0].article.markdown
							].join("\n") }) : result.posts.map((post, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [result.posts.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [index > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("hr", { className: "my-5 border-divider" }) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mb-3 text-caption font-semibold text-text-secondary",
								children: [
									"Post ",
									index + 1,
									" of ",
									result.posts.length
								]
							})] }) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PostView, { post })] }, post.id))
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "sheet-footer",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReaderActions, {
					onCopyMarkdown,
					onShare,
					onDownload
				})
			})
		]
	});
}
function PasteSheet({ open, onOpenChange, value, onChange, onFormat }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetFrame, {
		open,
		onOpenChange,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sheet-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Title, {
					className: "text-section font-bold",
					children: "Paste text"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "nav-text",
					onClick: () => onOpenChange(false),
					children: "Cancel"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Description, {
				className: "sr-only",
				children: "Paste the public post text to format as Markdown"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sheet-body gutter-x pb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-meta text-text-secondary",
					children: "Xtract will format what you paste. It will not invent missing text."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value,
					onChange: (e) => onChange(e.target.value),
					rows: 8,
					placeholder: "Paste the public post text",
					"data-vaul-no-drag": "",
					className: "mt-3 w-full rounded-well bg-fill p-3 text-body text-text-primary outline-none placeholder:text-text-secondary"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "sheet-footer",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "btn-primary w-full",
					disabled: !value.trim(),
					onClick: onFormat,
					children: "Format"
				})
			})
		]
	});
}
function SwapLabel({ text }) {
	const ref = (0, import_react.useRef)(null);
	const prev = (0, import_react.useRef)(text);
	(0, import_react.useEffect)(() => {
		const el = ref.current;
		if (!el || prev.current === text) return;
		const raw = getComputedStyle(document.documentElement).getPropertyValue("--text-swap-dur");
		const dur = parseFloat(raw) || 150;
		el.classList.add("is-exit");
		const timer = window.setTimeout(() => {
			el.textContent = text;
			el.classList.remove("is-exit");
			el.classList.add("is-enter-start");
			el.offsetHeight;
			el.classList.remove("is-enter-start");
		}, dur);
		prev.current = text;
		return () => window.clearTimeout(timer);
	}, [text]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "t-text-swap",
		ref,
		children: text
	});
}
function ReaderActions({ onCopyMarkdown, onShare, onDownload }) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	const [canShare, setCanShare] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
	}, []);
	(0, import_react.useEffect)(() => {
		if (!copied) return;
		const id = window.setTimeout(() => setCopied(false), 1600);
		return () => window.clearTimeout(id);
	}, [copied]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex gap-2",
		children: [
			canShare ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "btn-primary min-w-0 flex-1 gap-2 px-3",
				"aria-label": "Share Markdown",
				onClick: () => void onShare(),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share2, {
					className: "size-4 shrink-0",
					strokeWidth: 2
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "truncate",
					children: "Share"
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "btn-ghost min-w-0 flex-1 gap-2 px-3",
				"aria-label": "Copy Markdown",
				onClick: async () => {
					if (await onCopyMarkdown()) setCopied(true);
				},
				children: [copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
					className: "size-4 shrink-0",
					strokeWidth: 2.4
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
					className: "size-4 shrink-0",
					strokeWidth: 2
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "truncate",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwapLabel, { text: copied ? "Copied" : "Copy" })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: canShare ? "btn-ghost min-w-0 flex-1 gap-2 px-3" : "btn-primary min-w-0 flex-1 gap-2 px-3",
				"aria-label": "Download Markdown",
				onClick: onDownload,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
					className: "size-4 shrink-0",
					strokeWidth: 2
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "truncate",
					children: "Save"
				})]
			})
		]
	});
}
function PostView({ post }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "reader-body text-body",
		children: [
			post.text ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarkdownView, { markdown: post.text }) : null,
			post.quote ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("blockquote", {
				className: "mt-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: post.quote.text }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-meta",
					children: [
						"— ",
						post.quote.name,
						" (@",
						post.quote.handle,
						"),",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: post.quote.permalink,
							className: "link-blue",
							target: "_blank",
							rel: "noreferrer",
							children: "source"
						})
					]
				})]
			}) : null,
			post.article ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarkdownView, { markdown: `# ${post.article.title}\n\n${post.article.markdown}` })
			}) : null,
			post.media.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex flex-col gap-3",
				children: post.media.map((item, i) => item.kind === "image" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: item.url,
					alt: item.alt
				}, i) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: item.url,
					target: "_blank",
					rel: "noreferrer",
					className: "link-blue text-button font-semibold",
					children: item.label
				}, i))
			}) : null
		]
	});
}
function Counts({ post }) {
	const parts = [
		formatCount(post.likes, "likes"),
		formatCount(post.reposts, "reposts"),
		formatCount(post.replies, "replies"),
		formatCount(post.quotes, "quotes"),
		formatCount(post.views, "views")
	].filter(Boolean);
	if (!parts.length) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-2 text-meta text-text-secondary",
		children: parts.join(" · ")
	});
}
function Segmented({ view, onView }) {
	const pillRef = (0, import_react.useRef)(null);
	const readerRef = (0, import_react.useRef)(null);
	const rawRef = (0, import_react.useRef)(null);
	const firstPaint = (0, import_react.useRef)(true);
	const moveTo = (tab, animate) => {
		const pill = pillRef.current;
		if (!tab || !pill) return;
		if (!animate) {
			const prev = pill.style.transition;
			pill.style.transition = "none";
			pill.style.transform = `translateX(${tab.offsetLeft}px)`;
			pill.style.width = `${tab.offsetWidth}px`;
			pill.offsetWidth;
			pill.style.transition = prev;
			return;
		}
		pill.style.transform = `translateX(${tab.offsetLeft}px)`;
		pill.style.width = `${tab.offsetWidth}px`;
	};
	(0, import_react.useEffect)(() => {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "t-tabs",
		role: "tablist",
		"aria-label": "Reader mode",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "t-tabs-pill",
				"aria-hidden": "true",
				ref: pillRef
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				ref: readerRef,
				type: "button",
				role: "tab",
				"aria-selected": view === "reader",
				className: "t-tab",
				onClick: (e) => {
					moveTo(e.currentTarget, true);
					onView("reader");
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Type, {
					className: "size-3.5",
					strokeWidth: 2
				}), "Reading"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				ref: rawRef,
				type: "button",
				role: "tab",
				"aria-selected": view === "raw",
				className: "t-tab",
				onClick: (e) => {
					moveTo(e.currentTarget, true);
					onView("raw");
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, {
					className: "size-3.5",
					strokeWidth: 2
				}), "Markdown"]
			})
		]
	});
}
function HomeHistory({ items, onSelect, onClear }) {
	const [confirmClear, setConfirmClear] = (0, import_react.useState)(false);
	if (!items.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomeEmpty, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "section-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "section-label",
					children: "Recents"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "nav-text nav-text-destructive",
					onClick: () => {
						if (!confirmClear) {
							setConfirmClear(true);
							return;
						}
						onClear();
						setConfirmClear(false);
					},
					children: confirmClear ? "Clear All" : "Clear"
				})]
			}),
			confirmClear ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-4 pb-2 text-meta text-text-secondary",
				children: "Removes every extract on this device. This cannot be undone."
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HistoryRows, {
				items,
				onSelect
			})
		]
	});
}
function HistoryRows({ items, onSelect }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "grouped",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => onSelect(item),
			className: "row-push",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block text-history font-semibold",
					children: item.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "mt-1 block text-meta text-text-secondary",
					children: [
						"@",
						item.author.handle,
						item.date ? ` · ${formatWhen(item.date, true)}` : "",
						` · ${item.kind}`
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
				className: "size-5 shrink-0 text-text-tertiary",
				strokeWidth: 2
			})]
		}) }, `${item.id}-${item.extractedAt}`))
	});
}
function SettingsDrawer({ open, onOpenChange, bearerToken, onBearerToken, advancedOpen, onAdvancedOpen, signedIn, onRetry }) {
	const [draft, setDraft] = (0, import_react.useState)(bearerToken);
	(0, import_react.useEffect)(() => {
		if (open) setDraft(bearerToken);
	}, [open, bearerToken]);
	const dirty = draft.trim() !== bearerToken.trim();
	function close(next) {
		if (!next && dirty) return;
		onOpenChange(next);
	}
	function save() {
		onBearerToken(draft.trim());
		toast.success(draft.trim() ? "X session saved" : "X session cleared");
		onRetry?.();
		onOpenChange(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetFrame, {
		open,
		onOpenChange: close,
		dismissible: !dirty,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sheet-head",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Title, {
					className: "text-section font-bold",
					children: "Settings"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "nav-text",
					onClick: () => {
						setDraft(bearerToken);
						onOpenChange(false);
					},
					children: dirty ? "Cancel" : "Done"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Description, {
				className: "sr-only",
				children: "Optional X session and install notes"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sheet-body gutter-x pb-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-body text-text-secondary",
						children: "Public sources first. Sign in only if they fail."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grouped mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "group-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-history",
								children: "X session"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-0.5 text-meta text-text-secondary",
								children: signedIn ? "Saved on this device." : "Not connected."
							})] }), signedIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-1 text-caption font-semibold text-success",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
									className: "size-3.5",
									strokeWidth: 2.5
								}), "On"]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-caption text-text-tertiary",
								children: "Off"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "footnote",
						children: "The token never leaves this device except to call X after public sources fail."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grouped mt-6",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "group-row !flex-col !items-stretch !gap-2",
							htmlFor: "x-bearer",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-history",
								children: "Sign in with X"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "x-bearer",
								type: "password",
								autoComplete: "off",
								value: draft,
								onChange: (e) => setDraft(e.target.value),
								placeholder: "Bearer token",
								"data-vaul-no-drag": "",
								className: "h-11 w-full rounded-control bg-fill px-3 text-body text-text-primary outline-none placeholder:text-text-secondary"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "t-acc mt-6",
						"data-open": advancedOpen ? "true" : "false",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex min-h-11 w-full items-center justify-between px-1 text-meta font-normal text-text-secondary",
							"aria-expanded": advancedOpen,
							onClick: () => onAdvancedOpen(!advancedOpen),
							children: ["Advanced", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "t-acc-chevron",
								"aria-hidden": "true",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
									className: "size-4",
									strokeWidth: 2
								})
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "t-acc-panel",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "t-acc-panel-inner",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "footnote pb-2",
									children: "Optional. Public extracts do not need a token."
								})
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InstallHint, {})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "sheet-footer",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "btn-primary w-full",
					onClick: save,
					children: onRetry && draft.trim() ? "Save and retry" : "Save"
				})
			})
		]
	});
}
function HomeEmpty() {
	const [shown, setShown] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const id = requestAnimationFrame(() => setShown(true));
		return () => cancelAnimationFrame(id);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: shown ? "t-stagger is-shown mt-5 mb-5" : "t-stagger mt-5 mb-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "t-stagger-line t-stagger-line--1 text-screen-title font-bold tracking-[-0.03em] text-balance",
			children: "Paste a public post."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "t-stagger-line t-stagger-line--2 mt-2 max-w-prose text-body text-text-secondary",
			children: "Xtract returns the thread as Markdown."
		})]
	});
}
function InstallHint() {
	const [standalone, setStandalone] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const standaloneMode = window.matchMedia("(display-mode: standalone)").matches || "standalone" in navigator && Boolean(navigator.standalone);
		setStandalone(standaloneMode);
	}, []);
	if (standalone) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-8 footnote",
		children: "Share → Add to Home Screen."
	});
}
function formatWhen(iso, short = false) {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleString("en-US", {
		dateStyle: "medium",
		timeStyle: short ? void 0 : "short"
	});
}
function formatCount(value, label) {
	if (value == null) return null;
	return `${value.toLocaleString("en-US")} ${label}`;
}
async function writeClipboard(text) {
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
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(XtractApp, {});
}
//#endregion
export { Home as component };
