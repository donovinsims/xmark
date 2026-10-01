//#region node_modules/.nitro/vite/services/ssr/assets/parse-B7ZVtpjg.js
function buildMarkdown(input) {
	const { kind, permalink, author, title, date, posts } = input;
	const lines = [
		"---",
		`title: ${yamlValue(title)}`,
		`author: ${yamlValue(`${author.name} (@${author.handle})`)}`,
		...date ? [`date: ${yamlValue(date)}`] : [],
		`source: ${permalink}`,
		`type: ${kind}`,
		"---",
		""
	];
	if (kind === "article" && posts[0]?.article) {
		const article = posts[0].article;
		if (article.title) lines.push(`# ${article.title}`, "");
		if (posts[0].media.length) lines.push(...mediaMarkdown(posts[0].media), "");
		lines.push(article.markdown.trim(), "");
		return lines.join("\n").trimEnd() + "\n";
	}
	const total = posts.length;
	posts.forEach((post, index) => {
		if (total > 1) {
			if (index > 0) lines.push("---", "");
			lines.push(`Post ${index + 1} of ${total}`, "");
		}
		lines.push(...postToMarkdown(post));
		if (index < total - 1) lines.push("");
	});
	return lines.join("\n").trimEnd() + "\n";
}
function postToMarkdown(post) {
	const out = [];
	const text = post.text.trim();
	if (text) out.push(text, "");
	if (post.quote) out.push(...quoteToMarkdown(post.quote), "");
	if (post.article) {
		if (post.article.title) out.push(`# ${post.article.title}`, "");
		out.push(post.article.markdown.trim(), "");
	}
	if (post.media.length) out.push(...mediaMarkdown(post.media), "");
	while (out.length && out[out.length - 1] === "") out.pop();
	out.push("");
	return out;
}
function quoteToMarkdown(quote) {
	const body = (quote.text.trim() || "(quoted post has no text)").split("\n").map((line) => line ? `> ${line}` : ">");
	body.push(">");
	body.push(`> — ${quote.name} (@${quote.handle}), [source](${quote.permalink})`);
	return body;
}
function mediaMarkdown(media) {
	return media.map((item) => {
		if (item.kind === "image") return `![${item.alt || "Image"}](${item.url})`;
		return `[${item.label}](${item.url})`;
	});
}
function titleFromText(text, fallback) {
	const first = text.split(/\n+/).map((line) => line.trim()).find(Boolean);
	if (!first) return fallback;
	const collapsed = first.replace(/\s+/g, " ");
	return collapsed.length > 80 ? `${collapsed.slice(0, 77).trimEnd()}...` : collapsed;
}
function toIsoDate(value) {
	if (value == null || value === "") return "";
	if (typeof value === "number") {
		const ms = value > 0xe8d4a51000 ? value : value * 1e3;
		const d = new Date(ms);
		return Number.isNaN(d.getTime()) ? "" : d.toISOString();
	}
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
function downloadFilename(handle, id) {
	return `@${(handle || "unknown").replace(/[^A-Za-z0-9_]/g, "") || "unknown"}-${id.replace(/[^\d]/g, "") || "post"}.md`;
}
function yamlValue(value) {
	if (value === "") return "\"\"";
	if (/[:#{}[\],&*?|>!%@`'"]/.test(value) || /^\s|\s$/.test(value) || /\n/.test(value)) return JSON.stringify(value);
	return value;
}
function draftJsToMarkdown(content) {
	if (!content) return "";
	if (typeof content === "string") return content;
	if (typeof content !== "object") return "";
	const record = content;
	if (typeof record.markdown === "string" && record.markdown.trim()) return record.markdown;
	const blocks = Array.isArray(record.blocks) ? record.blocks : [];
	const entityMap = record.entityMap ?? {};
	const out = [];
	let listBuffer = null;
	const flushList = () => {
		if (!listBuffer) return;
		listBuffer.items.forEach((item, i) => {
			out.push(listBuffer.ordered ? `${i + 1}. ${item}` : `- ${item}`);
		});
		out.push("");
		listBuffer = null;
	};
	for (const rawBlock of blocks) {
		if (!rawBlock || typeof rawBlock !== "object") continue;
		const block = rawBlock;
		const type = block.type || "unstyled";
		const text = applyInline(block, entityMap);
		if (type === "unordered-list-item" || type === "ordered-list-item") {
			const ordered = type === "ordered-list-item";
			if (!listBuffer || listBuffer.ordered !== ordered) {
				flushList();
				listBuffer = {
					ordered,
					items: []
				};
			}
			listBuffer.items.push(text);
			continue;
		}
		flushList();
		switch (type) {
			case "header-one":
				out.push(`# ${text}`, "");
				break;
			case "header-two":
				out.push(`## ${text}`, "");
				break;
			case "header-three":
				out.push(`### ${text}`, "");
				break;
			case "header-four":
				out.push(`#### ${text}`, "");
				break;
			case "blockquote":
				out.push(...text.split("\n").map((line) => `> ${line}`), "");
				break;
			case "code-block":
				out.push("```", text, "```", "");
				break;
			case "atomic": {
				const atomic = atomicMarkdown(block, entityMap);
				if (atomic) out.push(atomic, "");
				break;
			}
			default: if (text.trim()) out.push(text, "");
			else out.push("");
		}
	}
	flushList();
	return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function applyInline(block, entityMap) {
	const text = block.text ?? "";
	if (!text) return "";
	const markers = [];
	let order = 0;
	for (const range of block.inlineStyleRanges ?? []) {
		const wrap = range.style === "BOLD" ? ["**", "**"] : range.style === "ITALIC" ? ["*", "*"] : range.style === "CODE" ? ["`", "`"] : null;
		if (!wrap) continue;
		markers.push({
			index: range.offset,
			open: wrap[0],
			close: "",
			order: order++
		});
		markers.push({
			index: range.offset + range.length,
			open: "",
			close: wrap[1],
			order: order++
		});
	}
	for (const range of block.entityRanges ?? []) {
		const entity = entityMap[String(range.key)];
		if (!entity) continue;
		const href = entityHref(entity);
		if (!href) continue;
		markers.push({
			index: range.offset,
			open: "[",
			close: "",
			order: order++
		});
		markers.push({
			index: range.offset + range.length,
			open: "",
			close: `](${href})`,
			order: order++
		});
	}
	markers.sort((a, b) => a.index - b.index || a.order - b.order);
	let cursor = 0;
	let result = "";
	for (const marker of markers) {
		result += text.slice(cursor, marker.index);
		result += marker.open + marker.close;
		cursor = marker.index;
	}
	result += text.slice(cursor);
	return result;
}
function entityHref(entity) {
	const type = (entity.type || "").toUpperCase();
	const data = entity.data ?? {};
	if (type === "LINK" || type === "URL") {
		const url = data.url ?? data.href ?? data.src;
		return typeof url === "string" ? url : null;
	}
	if (type === "MENTION") {
		const handle = data.screen_name ?? data.username ?? data.name;
		return typeof handle === "string" ? `https://x.com/${String(handle).replace(/^@/, "")}` : null;
	}
	return null;
}
function atomicMarkdown(block, entityMap) {
	for (const range of block.entityRanges ?? []) {
		const entity = entityMap[String(range.key)];
		if (!entity) continue;
		const data = entity.data ?? {};
		const type = (entity.type || "").toUpperCase();
		if (type.includes("IMAGE") || data.type === "photo") {
			const url = String(data.src ?? data.url ?? data.original_img_url ?? "");
			const alt = String(data.alt ?? data.altText ?? "Image");
			if (url) return `![${alt}](${url})`;
		}
		if (type.includes("VIDEO") || data.type === "video" || data.type === "gif") {
			const url = String(data.src ?? data.url ?? "");
			if (url) return `[${data.type === "gif" ? "GIF" : "Video"}](${url})`;
		}
		const url = String(data.url ?? data.src ?? "");
		if (url) return `[${String(data.title ?? "Link")}](${url})`;
	}
	return block.text?.trim() ?? "";
}
function resultFromPaste(input) {
	const text = input.text.trim();
	const id = input.parsedId || "pasted";
	const handle = input.parsedHandle || "unknown";
	const name = handle === "unknown" ? "Unknown" : handle;
	const permalink = input.canonical || "";
	const title = titleFromText(text, "Pasted post");
	const posts = [{
		id,
		permalink,
		text,
		createdAt: "",
		author: {
			name,
			handle
		},
		media: []
	}];
	const markdown = buildMarkdown({
		id,
		kind: "post",
		sourceName: "Pasted text",
		permalink: permalink || "pasted",
		author: {
			name,
			handle
		},
		title,
		date: "",
		posts
	});
	return {
		id,
		kind: "post",
		source: "Pasted text",
		permalink,
		author: {
			name,
			handle
		},
		title,
		date: "",
		posts,
		markdown,
		extractedAt: Date.now()
	};
}
function toResult(input) {
	const posts = [...input.posts].sort((a, b) => {
		const da = a.createdAt ? Date.parse(a.createdAt) : 0;
		const db = b.createdAt ? Date.parse(b.createdAt) : 0;
		if (da !== db) return da - db;
		return a.id.localeCompare(b.id);
	});
	const first = posts[0];
	const hasArticle = posts.some((p) => p.article);
	const kind = hasArticle ? "article" : posts.length > 1 ? "thread" : "post";
	const author = first.author;
	const title = hasArticle ? posts.find((p) => p.article)?.article?.title || titleFromText(first.text, first.id) : titleFromText(first.text, first.id);
	const permalink = input.permalink || first.permalink || `https://x.com/${author.handle}/status/${input.id}`;
	const date = first.createdAt;
	const markdown = buildMarkdown({
		id: input.id,
		kind,
		sourceName: input.source,
		permalink,
		author,
		title,
		date,
		posts
	});
	return {
		id: input.id,
		kind,
		source: input.source,
		permalink,
		author,
		title,
		date,
		posts,
		markdown,
		extractedAt: Date.now()
	};
}
var RAW_ID = /^\d{1,20}$/;
var HOSTS = /* @__PURE__ */ new Set([
	"x.com",
	"twitter.com",
	"t.co"
]);
var STATUS_PATH = /^(?:\/(?:i\/web|i)\/status\/(\d{1,20})(?:\/|$)|\/([^/]+)\/status\/(\d{1,20})(?:\/|$))/i;
function parseInput(raw) {
	const trimmed = raw.trim();
	if (!trimmed) return {
		ok: false,
		reason: "empty"
	};
	if (RAW_ID.test(trimmed)) return {
		ok: true,
		id: trimmed,
		canonical: canonicalPermalink(trimmed)
	};
	const url = coerceUrl(trimmed);
	if (!url) return {
		ok: false,
		reason: "invalid"
	};
	const host = normalizeHost(url.hostname);
	if (host === "t.co") {
		const idGuess = trimmed.match(/(\d{1,20})/);
		if (idGuess) return {
			ok: true,
			id: idGuess[1],
			canonical: canonicalPermalink(idGuess[1])
		};
		return {
			ok: false,
			reason: "invalid"
		};
	}
	if (!HOSTS.has(host)) return {
		ok: false,
		reason: "invalid"
	};
	const match = STATUS_PATH.exec(url.pathname);
	if (!match) {
		const trailingId = url.pathname.match(/\/(\d{1,20})\/?$/);
		if (trailingId) return {
			ok: true,
			id: trailingId[1],
			canonical: canonicalPermalink(trailingId[1])
		};
		return {
			ok: false,
			reason: "invalid"
		};
	}
	const id = match[1] || match[3];
	if (!id) return {
		ok: false,
		reason: "invalid"
	};
	const handleRaw = match[2];
	const handle = handleRaw && !["i", "web"].includes(handleRaw.toLowerCase()) ? handleRaw.replace(/^@/, "") : void 0;
	return {
		ok: true,
		id,
		handle,
		canonical: canonicalPermalink(id, handle)
	};
}
function canonicalPermalink(id, handle) {
	if (handle) return `https://x.com/${handle}/status/${id}`;
	return `https://x.com/i/status/${id}`;
}
function coerceUrl(value) {
	const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
	try {
		return new URL(candidate);
	} catch {
		return null;
	}
}
function normalizeHost(hostname) {
	return hostname.replace(/^(www|mobile|m)\./i, "").toLowerCase();
}
//#endregion
export { resultFromPaste as a, toResult as c, parseInput as i, downloadFilename as n, titleFromText as o, draftJsToMarkdown as r, toIsoDate as s, canonicalPermalink as t };
