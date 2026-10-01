import { c as toResult, i as parseInput, o as titleFromText, r as draftJsToMarkdown, s as toIsoDate, t as canonicalPermalink } from "./parse-B7ZVtpjg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/sources.server-B8n1lcek.js
var UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
var SOURCE_TIMEOUT_MS = 5500;
var OVERALL_MS = 14e3;
var RETRY_DELAY_MS = 280;
var FX_GRACE_MS = 1200;
var FatalExtractError = class extends Error {
	code;
	source;
	constructor(code, message, source) {
		super(message);
		this.code = code;
		this.source = source;
	}
};
async function runExtract(rawInput, bearerToken) {
	const parsed = parseInput(rawInput);
	if (!parsed.ok) return {
		ok: false,
		error: {
			code: parsed.reason === "empty" ? "empty" : "invalid",
			message: parsed.reason === "empty" ? "Paste an X URL or a numeric status ID." : "That doesn’t look like an X URL or status ID.",
			tried: []
		}
	};
	const tried = [];
	const overall = AbortSignal.timeout(OVERALL_MS);
	let sawRetryable = false;
	const primary = [{
		name: "FxTwitter",
		run: fetchFxV2
	}, {
		name: "VxTwitter",
		run: fetchVx
	}];
	const fallbacks = [
		{
			name: "FxTwitter (legacy)",
			run: fetchFxV1
		},
		{
			name: "oEmbed",
			run: fetchOEmbed
		},
		{
			name: "Jina",
			run: fetchJina
		}
	];
	if (bearerToken?.trim()) fallbacks.push({
		name: "X API",
		run: (id, _handle, signal) => fetchXApi(id, bearerToken.trim(), signal)
	});
	const finish = (posts, source) => {
		const sameAuthor = filterSameAuthorThread(posts);
		return {
			ok: true,
			result: toResult({
				id: parsed.id,
				source,
				posts: sameAuthor,
				permalink: canonicalPermalink(sameAuthor[0]?.id || parsed.id, sameAuthor[0]?.author.handle || parsed.handle)
			})
		};
	};
	try {
		const raced = await racePrimary(primary, parsed.id, parsed.handle, tried, overall, () => {
			sawRetryable = true;
		});
		if (raced) return finish(raced.posts, raced.name);
		for (const source of fallbacks) {
			if (overall.aborted) break;
			tried.push(source.name);
			try {
				const posts = await withRetry(() => source.run(parsed.id, parsed.handle, overall), overall);
				if (!posts.length) continue;
				return finish(posts, source.name);
			} catch (err) {
				if (err instanceof FatalExtractError) return {
					ok: false,
					error: {
						code: err.code,
						message: err.message,
						tried
					}
				};
				if (isRetryable(err)) sawRetryable = true;
			}
		}
	} catch (err) {
		if (err instanceof FatalExtractError) return {
			ok: false,
			error: {
				code: err.code,
				message: err.message,
				tried
			}
		};
		if (isRetryable(err) || isAbort(err)) sawRetryable = true;
	}
	return {
		ok: false,
		error: {
			code: sawRetryable || overall.aborted ? "network" : "gone",
			message: sawRetryable || overall.aborted ? "Couldn’t reach this post. Try again, or paste the text." : "This post isn’t public, or it was deleted.",
			tried
		}
	};
}
async function racePrimary(sources, id, handle, tried, signal, onRetryable) {
	const fx = sources[0];
	const vx = sources[1];
	tried.push(fx.name, vx.name);
	const run = async (source) => {
		try {
			const posts = await withRetry(() => source.run(id, handle, signal), signal);
			if (!posts.length) return {
				ok: false,
				name: source.name,
				err: /* @__PURE__ */ new Error("empty")
			};
			return {
				ok: true,
				name: source.name,
				posts
			};
		} catch (err) {
			if (isRetryable(err)) onRetryable();
			return {
				ok: false,
				name: source.name,
				err
			};
		}
	};
	const fxP = run(fx);
	const vxP = run(vx);
	const first = await Promise.race([fxP.then((r) => ({
		from: "fx",
		r
	})), vxP.then((r) => ({
		from: "vx",
		r
	}))]);
	if (first.r.ok && first.from === "fx") return first.r;
	if (first.r.ok && first.from === "vx") {
		const richer = await Promise.race([fxP.then((r) => r.ok ? r : null), delay(FX_GRACE_MS, signal).then(() => null).catch(() => null)]);
		if (richer) return richer;
		return first.r;
	}
	const other = first.from === "fx" ? await vxP : await fxP;
	if (other.ok) return other;
	const fatal = [first.from === "fx" ? first.r : other, first.from === "vx" ? first.r : other].find((r) => !r.ok && r.err instanceof FatalExtractError);
	if (fatal && !fatal.ok && fatal.err instanceof FatalExtractError) throw fatal.err;
	return null;
}
async function withRetry(fn, signal) {
	try {
		return await fn();
	} catch (err) {
		if (err instanceof FatalExtractError) throw err;
		if (signal?.aborted || !isRetryable(err)) throw err;
		await delay(RETRY_DELAY_MS, signal);
		return await fn();
	}
}
function isRetryable(err) {
	if (err instanceof FatalExtractError) return false;
	if (isAbort(err) && err.name !== "TimeoutError") return false;
	if ((err instanceof Error ? err.name : "") === "TimeoutError") return true;
	const msg = err instanceof Error ? err.message : String(err);
	if (/^timeout$/i.test(msg)) return true;
	if (/HTTP 429/.test(msg) || /HTTP 5\d\d/.test(msg)) return true;
	if (/HTTP 4\d\d/.test(msg)) return false;
	if (/empty|unreadable|unusable|no text|unauthorized/i.test(msg)) return false;
	return true;
}
function isAbort(err) {
	return err instanceof DOMException && (err.name === "AbortError" || err.name === "TimeoutError") || err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}
function delay(ms, signal) {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new DOMException("aborted", "AbortError"));
			return;
		}
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener("abort", () => {
			clearTimeout(timer);
			reject(new DOMException("aborted", "AbortError"));
		}, { once: true });
	});
}
function filterSameAuthorThread(posts) {
	if (posts.length <= 1) return posts;
	const handle = posts[0].author.handle.toLowerCase();
	const filtered = posts.filter((p) => p.author.handle.toLowerCase() === handle);
	const byId = /* @__PURE__ */ new Map();
	for (const post of filtered) byId.set(post.id, post);
	return [...byId.values()];
}
async function fetchFxV2(id, _handle, signal) {
	const data = await getJson(`https://api.fxtwitter.com/2/status/${id}`, signal);
	throwIfFxFatal(data, "FxTwitter");
	const status = asRecord(data.status) ?? asRecord(data.tweet);
	if (!status) throw new Error("FxTwitter v2 empty");
	const threadRaw = asArray(data.thread) ?? asArray(status.thread) ?? [];
	const main = fxStatusToPost(status);
	if (!main) throw new Error("FxTwitter v2 unreadable");
	return maybeWalkParents(mergePosts(main, threadRaw.map((item) => fxStatusToPost(asRecord(item) ?? {})).filter((p) => Boolean(p))), (parentId) => fetchFxV2Single(parentId, signal).catch(() => null));
}
async function fetchFxV2Single(id, signal) {
	const data = await getJson(`https://api.fxtwitter.com/2/status/${id}`, signal);
	const status = asRecord(data.status) ?? asRecord(data.tweet);
	return status ? fxStatusToPost(status) : null;
}
async function fetchFxV1(id, handle, signal) {
	const data = await getJson(handle ? `https://api.fxtwitter.com/${encodeURIComponent(handle)}/status/${id}` : `https://api.fxtwitter.com/status/${id}`, signal);
	throwIfFxFatal(data, "FxTwitter (legacy)");
	const tweet = asRecord(data.tweet) ?? asRecord(data.status);
	if (!tweet) throw new Error("FxTwitter legacy empty");
	const main = fxStatusToPost(tweet);
	if (!main) throw new Error("FxTwitter legacy unreadable");
	return mergePosts(main, (asArray(data.thread) ?? asArray(tweet.thread) ?? []).map((item) => fxStatusToPost(asRecord(item) ?? {})).filter((p) => Boolean(p)));
}
async function fetchVx(id, handle, signal) {
	const post = vxToPost(await getJson(`https://api.vxtwitter.com/${encodeURIComponent(handle || "i")}/status/${id}`, signal), id);
	if (!post) throw new Error("VxTwitter empty");
	return [post];
}
async function fetchOEmbed(id, handle, signal) {
	const url = canonicalPermalink(id, handle);
	const data = await getJson(`https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(url)}`, signal);
	const text = decodeEntities(stripTags(typeof data.html === "string" ? data.html : "")).trim();
	if (!text) throw new Error("oEmbed empty");
	const handleFromUrl = (typeof data.author_url === "string" ? data.author_url : "").split("/").filter(Boolean).pop();
	const name = typeof data.author_name === "string" && data.author_name ? data.author_name : handleFromUrl || "Unknown";
	const authorHandle = (handleFromUrl || handle || "unknown").replace(/^@/, "");
	return [{
		id,
		permalink: typeof data.url === "string" ? data.url : url,
		text,
		createdAt: "",
		author: {
			name,
			handle: authorHandle
		},
		media: []
	}];
}
async function fetchJina(id, handle, signal) {
	const body = (await (await fetchOk(`https://r.jina.ai/${canonicalPermalink(id, handle)}`, { Accept: "text/plain" }, signal)).text()).trim();
	if (!body) throw new Error("Jina empty");
	if (/sign in|log in to x|this post is unavailable|doesn’t exist/i.test(body.slice(0, 1500))) throw new Error("Jina unusable");
	const extracted = parseJinaBody(body, id, handle);
	if (!extracted.text.trim()) throw new Error("Jina no text");
	return [extracted];
}
async function fetchXApi(id, bearer, signal) {
	const res = await fetchOk(`https://api.x.com/2/tweets/${id}?${new URLSearchParams({
		"tweet.fields": "created_at,note_tweet,public_metrics,entities,attachments,referenced_tweets,conversation_id,text,author_id",
		expansions: "author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id",
		"user.fields": "name,username,protected",
		"media.fields": "url,preview_image_url,type,alt_text,variants"
	}).toString()}`, { Authorization: `Bearer ${bearer}` }, signal);
	const data = await res.json();
	if (res.status === 401 || res.status === 403) throw new Error("X API unauthorized");
	const tweet = asRecord(data.data);
	if (!tweet) throw new Error("X API empty");
	return [xApiToPost(tweet, asRecord(data.includes) ?? {})];
}
function throwIfFxFatal(data, source) {
	const code = Number(data.code ?? 0);
	const message = String(data.message ?? "");
	if (code === 401 || message === "PRIVATE_TWEET") throw new FatalExtractError("private", "This post is private. Xtract only extracts public posts.", source);
	if (code === 404 || message === "NOT_FOUND") throw new Error("not found");
}
function fxStatusToPost(status) {
	const id = String(status.id ?? "");
	if (!id) return null;
	const author = fxAuthor(asRecord(status.author) ?? asRecord(status.user) ?? {});
	const text = pickText(status);
	const permalink = typeof status.url === "string" && status.url ? status.url.replace("https://twitter.com", "https://x.com") : canonicalPermalink(id, author.handle);
	const createdAt = toIsoDate(status.created_at ?? status.created_timestamp) || "";
	const quoteRaw = asRecord(status.quote);
	const quote = quoteRaw ? fxQuote(quoteRaw) : void 0;
	const article = fxArticle(asRecord(status.article), text);
	const replying = status.replying_to;
	let replyingToId;
	let replyingToHandle;
	if (typeof replying === "string") replyingToHandle = replying.replace(/^@/, "");
	else if (replying && typeof replying === "object") {
		const rec = asRecord(replying) ?? {};
		if (typeof rec.status === "string") replyingToId = rec.status;
		if (typeof rec.screen_name === "string") replyingToHandle = rec.screen_name.replace(/^@/, "");
	}
	if (!replyingToId && typeof status.replying_to_status === "string") replyingToId = status.replying_to_status;
	return {
		id,
		permalink,
		text,
		createdAt,
		author,
		likes: num(status.likes),
		reposts: num(status.reposts ?? status.retweets),
		replies: num(status.replies),
		quotes: num(status.quotes),
		bookmarks: num(status.bookmarks),
		views: num(status.views),
		media: fxMedia(asRecord(status.media)),
		quote,
		article,
		replyingToId,
		replyingToHandle
	};
}
function fxAuthor(raw) {
	const handle = String(raw.screen_name ?? raw.username ?? "unknown").replace(/^@/, "");
	return {
		name: String(raw.name ?? handle),
		handle
	};
}
function fxQuote(raw) {
	if (String(raw.type ?? "") === "tombstone") return void 0;
	const author = fxAuthor(asRecord(raw.author) ?? {});
	const id = String(raw.id ?? "");
	const text = pickText(raw);
	if (!id && !text) return void 0;
	return {
		name: author.name,
		handle: author.handle,
		text,
		permalink: typeof raw.url === "string" ? String(raw.url).replace("https://twitter.com", "https://x.com") : canonicalPermalink(id, author.handle)
	};
}
function fxArticle(raw, fallbackText) {
	if (!raw) return void 0;
	const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : titleFromText(fallbackText, "Article");
	const content = raw.content ?? raw.body;
	let markdown = "";
	if (typeof raw.markdown === "string") markdown = raw.markdown;
	else markdown = draftJsToMarkdown(content);
	if (!markdown.trim()) markdown = fallbackText;
	return {
		title,
		markdown
	};
}
function fxMedia(media) {
	if (!media) return [];
	const all = asArray(media.all);
	const photos = asArray(media.photos);
	const videos = asArray(media.videos);
	const ordered = all.length ? all : [...photos, ...videos];
	const items = [];
	for (const entry of ordered) {
		const rec = asRecord(entry);
		if (!rec) continue;
		const type = String(rec.type ?? rec.kind ?? "").toLowerCase();
		const url = String(rec.url ?? rec.transcode_url ?? "");
		if (!url) continue;
		if (type === "photo" || type === "image" || !type && photos.includes(entry)) items.push({
			kind: "image",
			url,
			alt: String(rec.altText ?? rec.alt ?? "Image")
		});
		else if (type === "gif") items.push({
			kind: "video",
			url,
			previewUrl: str(rec.thumbnail_url),
			label: "GIF"
		});
		else if (type === "video" || rec.duration != null) items.push({
			kind: "video",
			url,
			previewUrl: str(rec.thumbnail_url),
			label: "Video"
		});
		else items.push({
			kind: "image",
			url,
			alt: String(rec.altText ?? rec.alt ?? "Image")
		});
	}
	return items;
}
function vxToPost(data, fallbackId) {
	const id = String(data.tweetID ?? data.tweet_id ?? fallbackId);
	const handle = String(data.user_screen_name ?? "unknown").replace(/^@/, "");
	const name = String(data.user_name ?? handle);
	const text = String(data.text ?? "").trim();
	const permalink = String(data.tweetURL ?? canonicalPermalink(id, handle)).replace("https://twitter.com", "https://x.com");
	const createdAt = toIsoDate(data.date ?? data.date_epoch) || "";
	const media = [];
	const extended = asArray(data.media_extended);
	for (const entry of extended) {
		const rec = asRecord(entry);
		if (!rec) continue;
		const type = String(rec.type ?? "").toLowerCase();
		const url = String(rec.url ?? "");
		if (!url) continue;
		if (type === "image" || type === "photo") media.push({
			kind: "image",
			url,
			alt: String(rec.altText ?? "Image")
		});
		else if (type === "gif") media.push({
			kind: "video",
			url,
			previewUrl: str(rec.thumbnail_url),
			label: "GIF"
		});
		else media.push({
			kind: "video",
			url,
			previewUrl: str(rec.thumbnail_url),
			label: "Video"
		});
	}
	const qrt = asRecord(data.qrt);
	const quote = qrt ? {
		name: String(qrt.user_name ?? qrt.name ?? "Unknown"),
		handle: String(qrt.user_screen_name ?? qrt.screen_name ?? "unknown").replace(/^@/, ""),
		text: String(qrt.text ?? "").trim(),
		permalink: String(qrt.tweetURL ?? qrt.url ?? "").replace("https://twitter.com", "https://x.com")
	} : void 0;
	const articleRaw = asRecord(data.article);
	const article = articleRaw ? fxArticle(articleRaw, text) : void 0;
	if (!text && !media.length && !article) return null;
	return {
		id,
		permalink,
		text,
		createdAt,
		author: {
			name,
			handle
		},
		likes: num(data.likes),
		reposts: num(data.retweets),
		replies: num(data.replies),
		media,
		quote,
		article,
		replyingToId: str(data.replyingToID),
		replyingToHandle: str(data.replyingTo)?.replace(/^@/, "")
	};
}
function xApiToPost(tweet, includes) {
	const id = String(tweet.id ?? "");
	const users = asArray(includes.users);
	const mediaIncludes = asArray(includes.media);
	const authorId = String(tweet.author_id ?? "");
	const user = users.map((u) => asRecord(u)).find((u) => u && String(u.id) === authorId) ?? {};
	const handle = String(user.username ?? "unknown");
	const name = String(user.name ?? handle);
	const note = asRecord(tweet.note_tweet);
	const text = String(note?.text ?? tweet.text ?? "").trim();
	const metrics = asRecord(tweet.public_metrics) ?? {};
	const keys = asArray(asRecord(tweet.attachments)?.media_keys).map(String);
	const media = [];
	for (const item of mediaIncludes) {
		const rec = asRecord(item);
		if (!rec) continue;
		if (keys.length && !keys.includes(String(rec.media_key ?? ""))) continue;
		const type = String(rec.type ?? "");
		if (type === "photo") {
			const url = String(rec.url ?? "");
			if (url) media.push({
				kind: "image",
				url,
				alt: String(rec.alt_text ?? "Image")
			});
		} else {
			const url = pickVariant(asArray(rec.variants)) || String(rec.preview_image_url ?? "");
			if (url) media.push({
				kind: "video",
				url,
				previewUrl: str(rec.preview_image_url),
				label: type === "animated_gif" ? "GIF" : "Video"
			});
		}
	}
	const referenced = asArray(tweet.referenced_tweets);
	let quote;
	for (const ref of referenced) {
		const rec = asRecord(ref);
		if (!rec || rec.type !== "quoted") continue;
		const qid = String(rec.id ?? "");
		const qt = asArray(includes.tweets).map((t) => asRecord(t)).find((t) => t && String(t.id) === qid);
		if (!qt) continue;
		const qAuthorId = String(qt.author_id ?? "");
		const qUser = users.map((u) => asRecord(u)).find((u) => u && String(u.id) === qAuthorId) ?? {};
		quote = {
			name: String(qUser.name ?? "Unknown"),
			handle: String(qUser.username ?? "unknown"),
			text: String(qt.text ?? "").trim(),
			permalink: canonicalPermalink(qid, String(qUser.username ?? "i"))
		};
	}
	return {
		id,
		permalink: canonicalPermalink(id, handle),
		text,
		createdAt: toIsoDate(str(tweet.created_at)) || "",
		author: {
			name,
			handle
		},
		likes: num(metrics.like_count),
		reposts: num(metrics.retweet_count),
		replies: num(metrics.reply_count),
		quotes: num(metrics.quote_count),
		bookmarks: num(metrics.bookmark_count),
		views: num(metrics.impression_count),
		media,
		quote
	};
}
function pickVariant(variants) {
	let best = "";
	let bestBit = -1;
	for (const v of variants) {
		const rec = asRecord(v);
		if (!rec) continue;
		const url = String(rec.url ?? "");
		if (!url) continue;
		const bitrate = Number(rec.bit_rate ?? 0);
		if (bitrate >= bestBit) {
			bestBit = bitrate;
			best = url;
		}
	}
	return best;
}
function pickText(status) {
	const raw = asRecord(status.raw_text);
	const candidates = [
		asRecord(status.note_tweet)?.text,
		raw?.text,
		status.text,
		status.full_text
	];
	for (const c of candidates) if (typeof c === "string" && c.trim()) return c;
	return "";
}
function mergePosts(main, others) {
	const map = /* @__PURE__ */ new Map();
	map.set(main.id, main);
	for (const post of others) map.set(post.id, post);
	return [...map.values()];
}
async function maybeWalkParents(posts, fetchOne) {
	if (posts.length > 1) return posts;
	const first = posts[0];
	if (!first?.replyingToId) return posts;
	if (first.replyingToHandle && first.replyingToHandle.toLowerCase() !== first.author.handle.toLowerCase()) return posts;
	const collected = [...posts];
	let current = first;
	for (let i = 0; i < 24; i++) {
		const parentId = current.replyingToId;
		if (!parentId) break;
		if (collected.some((p) => p.id === parentId)) break;
		const parent = await fetchOne(parentId);
		if (!parent) break;
		if (parent.author.handle.toLowerCase() !== first.author.handle.toLowerCase()) break;
		collected.unshift(parent);
		current = parent;
	}
	return collected;
}
function parseJinaBody(body, id, handle) {
	let text = body;
	const mdIndex = body.search(/markdown content:/i);
	if (mdIndex >= 0) text = body.slice(mdIndex).replace(/markdown content:\s*/i, "");
	text = text.replace(/^title:.*$/im, "").replace(/^url source:.*$/im, "").replace(/^published time:.*$/im, "").replace(/^markdown content:\s*/im, "").trim();
	const handleMatch = text.match(/@([A-Za-z0-9_]{1,15})/);
	const authorHandle = handle || handleMatch?.[1] || "unknown";
	return {
		id,
		permalink: canonicalPermalink(id, handle),
		text,
		createdAt: "",
		author: {
			name: authorHandle,
			handle: authorHandle
		},
		media: []
	};
}
async function getJson(url, signal) {
	const data = await (await fetchOk(url, void 0, signal)).json();
	if (!data || typeof data !== "object") throw new Error("invalid json");
	return data;
}
async function fetchOk(url, extraHeaders, signal) {
	const sourceTimeout = AbortSignal.timeout(SOURCE_TIMEOUT_MS);
	const combined = signal ? AbortSignal.any([signal, sourceTimeout]) : sourceTimeout;
	let res;
	try {
		res = await fetch(url, {
			headers: {
				"User-Agent": UA,
				Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
				...extraHeaders
			},
			redirect: "follow",
			signal: combined
		});
	} catch (err) {
		if (signal?.aborted) throw err;
		if (sourceTimeout.aborted) {
			const timeout = /* @__PURE__ */ new Error("timeout");
			timeout.name = "TimeoutError";
			throw timeout;
		}
		throw err;
	}
	if (res.status === 401) {
		const body = await res.text().catch(() => "");
		if (/PRIVATE/i.test(body)) throw new FatalExtractError("private", "This post is private. Xtract only extracts public posts.", url);
		throw new Error(`HTTP 401`);
	}
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res;
}
function asRecord(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function asArray(value) {
	return Array.isArray(value) ? value : [];
}
function num(value) {
	if (value == null || value === "") return void 0;
	const n = Number(value);
	return Number.isFinite(n) ? n : void 0;
}
function str(value) {
	return typeof value === "string" && value ? value : void 0;
}
function stripTags(html) {
	return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n");
}
function decodeEntities(text) {
	return text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
//#endregion
export { runExtract };
