import { draftJsToMarkdown, toIsoDate, toResult, titleFromText } from "./markdown";
import { canonicalPermalink, parseInput } from "./parse";
import type {
  ArticleBody,
  Author,
  ExtractError,
  ExtractResponse,
  MediaItem,
  PostBody,
  QuotedPost,
} from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const SOURCE_TIMEOUT_MS = 5500;
const OVERALL_MS = 14000;
const RETRY_DELAY_MS = 280;
const FX_GRACE_MS = 2000;

class FatalExtractError extends Error {
  code: ExtractError["code"];
  source: string;
  constructor(code: ExtractError["code"], message: string, source: string) {
    super(message);
    this.code = code;
    this.source = source;
  }
}

type SourceAttempt = {
  name: string;
  run: (id: string, handle: string | undefined, signal: AbortSignal) => Promise<PostBody[]>;
};

export async function runExtract(
  rawInput: string,
  bearerToken?: string,
): Promise<ExtractResponse> {
  const parsed = parseInput(rawInput);
  if (!parsed.ok) {
    return {
      ok: false,
      error: {
        code: parsed.reason === "empty" ? "empty" : "invalid",
        message:
          parsed.reason === "empty"
            ? "Paste an X URL or a numeric status ID."
            : "That doesn’t look like an X URL or status ID.",
        tried: [],
      },
    };
  }

  const tried: string[] = [];
  const overall = AbortSignal.timeout(OVERALL_MS);
  let sawRetryable = false;

  const primary: SourceAttempt[] = [
    { name: "FxTwitter", run: fetchFxV2 },
    { name: "VxTwitter", run: fetchVx },
  ];
  const fallbacks: SourceAttempt[] = [
    { name: "FxTwitter (legacy)", run: fetchFxV1 },
    { name: "oEmbed", run: fetchOEmbed },
    { name: "Jina", run: fetchJina },
  ];
  if (bearerToken?.trim()) {
    fallbacks.push({
      name: "X API",
      run: (id, _handle, signal) => fetchXApi(id, bearerToken.trim(), signal),
    });
  }

  const finish = (posts: PostBody[], source: string): ExtractResponse => {
    const sameAuthor = filterSameAuthorThread(posts);
    return {
      ok: true,
      result: toResult({
        id: parsed.id,
        source,
        posts: sameAuthor,
        permalink: canonicalPermalink(
          sameAuthor[0]?.id || parsed.id,
          sameAuthor[0]?.author.handle || parsed.handle,
        ),
      }),
    };
  };

  try {
    const raced = await racePrimary(primary, parsed.id, parsed.handle, tried, overall, () => {
      sawRetryable = true;
    });
    if (raced) {
      const posts = await expandSameAuthorThread(raced.posts, parsed.id, overall);
      return finish(posts, raced.name);
    }

    for (const source of fallbacks) {
      if (overall.aborted) break;
      tried.push(source.name);
      try {
        const posts = await withRetry(() => source.run(parsed.id, parsed.handle, overall), overall);
        if (!posts.length) continue;
        const expanded = await expandSameAuthorThread(posts, parsed.id, overall);
        return finish(expanded, source.name);
      } catch (err) {
        if (err instanceof FatalExtractError) {
          return {
            ok: false,
            error: { code: err.code, message: err.message, tried },
          };
        }
        if (isRetryable(err)) sawRetryable = true;
      }
    }
  } catch (err) {
    if (err instanceof FatalExtractError) {
      return {
        ok: false,
        error: { code: err.code, message: err.message, tried },
      };
    }
    if (isRetryable(err) || isAbort(err)) sawRetryable = true;
  }

  return {
    ok: false,
    error: {
      code: sawRetryable || overall.aborted ? "network" : "gone",
      message:
        sawRetryable || overall.aborted
          ? "Couldn’t reach this post. Try again, or paste the text."
          : "This post isn’t public, or it was deleted.",
      tried,
    },
  };
}

async function racePrimary(
  sources: SourceAttempt[],
  id: string,
  handle: string | undefined,
  tried: string[],
  signal: AbortSignal,
  onRetryable: () => void,
): Promise<{ name: string; posts: PostBody[] } | null> {
  const fx = sources[0]!;
  const vx = sources[1]!;
  tried.push(fx.name, vx.name);

  type Outcome =
    | { ok: true; name: string; posts: PostBody[] }
    | { ok: false; name: string; err: unknown };

  const run = async (source: SourceAttempt): Promise<Outcome> => {
    try {
      const posts = await withRetry(() => source.run(id, handle, signal), signal);
      if (!posts.length) return { ok: false, name: source.name, err: new Error("empty") };
      return { ok: true, name: source.name, posts };
    } catch (err) {
      if (isRetryable(err)) onRetryable();
      return { ok: false, name: source.name, err };
    }
  };

  const fxP = run(fx);
  const vxP = run(vx);

  const first = await Promise.race([
    fxP.then((r) => ({ from: "fx" as const, r })),
    vxP.then((r) => ({ from: "vx" as const, r })),
  ]);

  if (first.r.ok && first.from === "fx") return first.r;
  if (first.r.ok && first.from === "vx") {
    const richer = await Promise.race([
      fxP.then((r) => (r.ok ? r : null)),
      delay(FX_GRACE_MS, signal)
        .then(() => null)
        .catch(() => null),
    ]);
    if (richer) return richer;
    return first.r;
  }

  const other = first.from === "fx" ? await vxP : await fxP;
  if (other.ok) return other;

  const fxResult = first.from === "fx" ? first.r : other;
  const vxResult = first.from === "vx" ? first.r : other;
  const fatal = [fxResult, vxResult].find(
    (r) => !r.ok && r.err instanceof FatalExtractError,
  );
  if (fatal && !fatal.ok && fatal.err instanceof FatalExtractError) throw fatal.err;
  return null;
}

async function withRetry<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof FatalExtractError) throw err;
    if (signal?.aborted || !isRetryable(err)) throw err;
    await delay(RETRY_DELAY_MS, signal);
    return await fn();
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof FatalExtractError) return false;
  if (isAbort(err) && (err as Error).name !== "TimeoutError") return false;
  const name = err instanceof Error ? err.name : "";
  if (name === "TimeoutError") return true;
  const msg = err instanceof Error ? err.message : String(err);
  if (/^timeout$/i.test(msg)) return true;
  if (/HTTP 429/.test(msg) || /HTTP 5\d\d/.test(msg)) return true;
  if (/HTTP 4\d\d/.test(msg)) return false;
  if (/empty|unreadable|unusable|no text|unauthorized/i.test(msg)) return false;
  return true;
}

function isAbort(err: unknown): boolean {
  return (
    (err instanceof DOMException && (err.name === "AbortError" || err.name === "TimeoutError")) ||
    (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError"))
  );
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function filterSameAuthorThread(posts: PostBody[]): PostBody[] {
  if (posts.length <= 1) return posts;
  const handle = posts[0]!.author.handle.toLowerCase();
  const filtered = posts.filter((p) => p.author.handle.toLowerCase() === handle);
  const byId = new Map<string, PostBody>();
  for (const post of filtered) byId.set(post.id, post);
  return sortThread([...byId.values()]);
}

function sortThread(posts: PostBody[]): PostBody[] {
  return [...posts].sort((a, b) => {
    if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
      return a.createdAt.localeCompare(b.createdAt);
    }
    try {
      const left = BigInt(a.id);
      const right = BigInt(b.id);
      return left < right ? -1 : left > right ? 1 : 0;
    } catch {
      return a.id.localeCompare(b.id);
    }
  });
}

async function fetchFxV2(
  id: string,
  _handle?: string,
  signal?: AbortSignal,
): Promise<PostBody[]> {
  const data = await fetchFxThreadPayload(id, signal);
  const posts = fxPayloadToPosts(data, "FxTwitter");
  return maybeWalkParents(posts, (parentId) =>
    fetchFxV2Single(parentId, signal).catch(() => null),
  );
}

async function fetchFxThreadPayload(
  id: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  try {
    const data = await getJson(`https://api.fxtwitter.com/2/thread/${id}`, signal);
    if (asArray(data.thread).length || asRecord(data.status) || asRecord(data.tweet)) {
      return data;
    }
  } catch (err) {
    if (err instanceof FatalExtractError) throw err;
    if (signal?.aborted) throw err;
  }
  return getJson(`https://api.fxtwitter.com/2/status/${id}`, signal);
}

function fxPayloadToPosts(data: Record<string, unknown>, source: string): PostBody[] {
  throwIfFxFatal(data, source);
  const thread = asArray(data.thread)
    .map((item) => fxStatusToPost(asRecord(item) ?? {}))
    .filter((p): p is PostBody => Boolean(p));
  if (thread.length > 1) return sortThread(thread);
  const status = asRecord(data.status) ?? asRecord(data.tweet);
  const main = status ? fxStatusToPost(status) : thread[0] ?? null;
  if (!main) throw new Error(`${source} empty`);
  if (thread.length === 1 && thread[0]!.id !== main.id) {
    return sortThread(mergePosts(main, thread));
  }
  return thread.length === 1 ? thread : [main];
}

async function expandSameAuthorThread(
  posts: PostBody[],
  id: string,
  signal: AbortSignal,
): Promise<PostBody[]> {
  if (posts.length > 1) return posts;
  try {
    const data = await getJson(`https://api.fxtwitter.com/2/thread/${id}`, signal);
    const expanded = fxPayloadToPosts(data, "FxTwitter");
    if (expanded.length > 1) return expanded;
  } catch (err) {
    if (err instanceof FatalExtractError) throw err;
  }
  return maybeWalkParents(posts, (parentId) =>
    fetchFxV2Single(parentId, signal).catch(() => null),
  );
}

async function fetchFxV2Single(id: string, signal?: AbortSignal): Promise<PostBody | null> {
  const data = await getJson(`https://api.fxtwitter.com/2/status/${id}`, signal);
  const status = asRecord(data.status) ?? asRecord(data.tweet);
  return status ? fxStatusToPost(status) : null;
}

async function fetchFxV1(
  id: string,
  handle?: string,
  signal?: AbortSignal,
): Promise<PostBody[]> {
  const path = handle
    ? `https://api.fxtwitter.com/${encodeURIComponent(handle)}/status/${id}`
    : `https://api.fxtwitter.com/status/${id}`;
  const data = await getJson(path, signal);
  throwIfFxFatal(data, "FxTwitter (legacy)");
  return fxPayloadToPosts(data, "FxTwitter (legacy)");
}

async function fetchVx(
  id: string,
  handle?: string,
  signal?: AbortSignal,
): Promise<PostBody[]> {
  const who = handle || "i";
  const data = await getJson(
    `https://api.vxtwitter.com/${encodeURIComponent(who)}/status/${id}`,
    signal,
  );
  const post = vxToPost(data, id);
  if (!post) throw new Error("VxTwitter empty");
  return [post];
}

async function fetchOEmbed(
  id: string,
  handle?: string,
  signal?: AbortSignal,
): Promise<PostBody[]> {
  const url = canonicalPermalink(id, handle);
  const data = await getJson(
    `https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(url)}`,
    signal,
  );
  const html = typeof data.html === "string" ? data.html : "";
  const text = decodeEntities(stripTags(html)).trim();
  if (!text) throw new Error("oEmbed empty");
  const authorUrl = typeof data.author_url === "string" ? data.author_url : "";
  const handleFromUrl = authorUrl.split("/").filter(Boolean).pop();
  const name =
    typeof data.author_name === "string" && data.author_name
      ? data.author_name
      : handleFromUrl || "Unknown";
  const authorHandle = (handleFromUrl || handle || "unknown").replace(/^@/, "");
  return [
    {
      id,
      permalink: typeof data.url === "string" ? data.url : url,
      text,
      createdAt: "",
      author: { name, handle: authorHandle },
      media: [],
    },
  ];
}

async function fetchJina(
  id: string,
  handle?: string,
  signal?: AbortSignal,
): Promise<PostBody[]> {
  const target = canonicalPermalink(id, handle);
  const res = await fetchOk(`https://r.jina.ai/${target}`, { Accept: "text/plain" }, signal);
  const body = (await res.text()).trim();
  if (!body) throw new Error("Jina empty");
  if (/sign in|log in to x|this post is unavailable|doesn’t exist/i.test(body.slice(0, 1500))) {
    throw new Error("Jina unusable");
  }
  const extracted = parseJinaBody(body, id, handle);
  if (!extracted.text.trim()) throw new Error("Jina no text");
  return [extracted];
}

async function fetchXApi(id: string, bearer: string, signal?: AbortSignal): Promise<PostBody[]> {
  const params = new URLSearchParams({
    "tweet.fields":
      "created_at,note_tweet,public_metrics,entities,attachments,referenced_tweets,conversation_id,text,author_id",
    expansions:
      "author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id",
    "user.fields": "name,username,protected",
    "media.fields": "url,preview_image_url,type,alt_text,variants",
  });
  const res = await fetchOk(
    `https://api.x.com/2/tweets/${id}?${params.toString()}`,
    { Authorization: `Bearer ${bearer}` },
    signal,
  );
  const data = (await res.json()) as Record<string, unknown>;
  if (res.status === 401 || res.status === 403) {
    throw new Error("X API unauthorized");
  }
  const tweet = asRecord(data.data);
  if (!tweet) throw new Error("X API empty");
  const includes = asRecord(data.includes) ?? {};
  return [xApiToPost(tweet, includes)];
}

function throwIfFxFatal(data: Record<string, unknown>, source: string) {
  const code = Number(data.code ?? 0);
  const message = String(data.message ?? "");
  if (code === 401 || message === "PRIVATE_TWEET") {
    throw new FatalExtractError(
      "private",
      "This post is private. Xtract only extracts public posts.",
      source,
    );
  }
  if (code === 404 || message === "NOT_FOUND") {
    throw new Error("not found");
  }
}

function fxStatusToPost(status: Record<string, unknown>): PostBody | null {
  const id = String(status.id ?? "");
  if (!id) return null;
  const author = fxAuthor(asRecord(status.author) ?? asRecord(status.user) ?? {});
  const text = pickText(status);
  const permalink =
    typeof status.url === "string" && status.url
      ? status.url.replace("https://twitter.com", "https://x.com")
      : canonicalPermalink(id, author.handle);
  const createdAt =
    toIsoDate(
      (status.created_at as string | undefined) ??
        (status.created_timestamp as number | undefined),
    ) || "";
  const quoteRaw = asRecord(status.quote);
  const quote = quoteRaw ? fxQuote(quoteRaw) : undefined;
  const article = fxArticle(asRecord(status.article), text);
  const replying = status.replying_to;
  let replyingToId: string | undefined;
  let replyingToHandle: string | undefined;
  if (typeof replying === "string") {
    replyingToHandle = replying.replace(/^@/, "");
  } else if (replying && typeof replying === "object") {
    const rec = asRecord(replying) ?? {};
    if (typeof rec.status === "string") replyingToId = rec.status;
    if (typeof rec.screen_name === "string") {
      replyingToHandle = rec.screen_name.replace(/^@/, "");
    }
  }
  if (!replyingToId && typeof status.replying_to_status === "string") {
    replyingToId = status.replying_to_status;
  }
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
    replyingToHandle,
  };
}

function fxAuthor(raw: Record<string, unknown>): Author {
  const handle = String(raw.screen_name ?? raw.username ?? "unknown").replace(/^@/, "");
  const name = String(raw.name ?? handle);
  return { name, handle };
}

function fxQuote(raw: Record<string, unknown>): QuotedPost | undefined {
  const type = String(raw.type ?? "");
  if (type === "tombstone") return undefined;
  const author = fxAuthor(asRecord(raw.author) ?? {});
  const id = String(raw.id ?? "");
  const text = pickText(raw);
  if (!id && !text) return undefined;
  return {
    name: author.name,
    handle: author.handle,
    text,
    permalink:
      typeof raw.url === "string"
        ? String(raw.url).replace("https://twitter.com", "https://x.com")
        : canonicalPermalink(id, author.handle),
  };
}

function fxArticle(
  raw: Record<string, unknown> | null,
  fallbackText: string,
): ArticleBody | undefined {
  if (!raw) return undefined;
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : titleFromText(fallbackText, "Article");
  const content = raw.content ?? raw.body;
  let markdown = "";
  if (typeof raw.markdown === "string") markdown = raw.markdown;
  else markdown = draftJsToMarkdown(content);
  if (!markdown.trim()) markdown = fallbackText;
  return { title, markdown };
}

function fxMedia(media: Record<string, unknown> | null): MediaItem[] {
  if (!media) return [];
  const all = asArray(media.all);
  const photos = asArray(media.photos);
  const videos = asArray(media.videos);
  const ordered = all.length ? all : [...photos, ...videos];
  const items: MediaItem[] = [];
  for (const entry of ordered) {
    const rec = asRecord(entry);
    if (!rec) continue;
    const type = String(rec.type ?? rec.kind ?? "").toLowerCase();
    const url = String(rec.url ?? rec.transcode_url ?? "");
    if (!url) continue;
    if (type === "photo" || type === "image" || (!type && photos.includes(entry))) {
      items.push({
        kind: "image",
        url,
        alt: String(rec.altText ?? rec.alt ?? "Image"),
      });
    } else if (type === "gif") {
      items.push({ kind: "video", url, previewUrl: str(rec.thumbnail_url), label: "GIF" });
    } else if (type === "video" || rec.duration != null) {
      items.push({
        kind: "video",
        url,
        previewUrl: str(rec.thumbnail_url),
        label: "Video",
      });
    } else {
      items.push({ kind: "image", url, alt: String(rec.altText ?? rec.alt ?? "Image") });
    }
  }
  return items;
}

function vxToPost(data: Record<string, unknown>, fallbackId: string): PostBody | null {
  const id = String(data.tweetID ?? data.tweet_id ?? fallbackId);
  const handle = String(data.user_screen_name ?? "unknown").replace(/^@/, "");
  const name = String(data.user_name ?? handle);
  const text = String(data.text ?? "").trim();
  const permalink = String(data.tweetURL ?? canonicalPermalink(id, handle)).replace(
    "https://twitter.com",
    "https://x.com",
  );
  const createdAt = toIsoDate((data.date as string) ?? (data.date_epoch as number)) || "";
  const media: MediaItem[] = [];
  const extended = asArray(data.media_extended);
  for (const entry of extended) {
    const rec = asRecord(entry);
    if (!rec) continue;
    const type = String(rec.type ?? "").toLowerCase();
    const url = String(rec.url ?? "");
    if (!url) continue;
    if (type === "image" || type === "photo") {
      media.push({ kind: "image", url, alt: String(rec.altText ?? "Image") });
    } else if (type === "gif") {
      media.push({
        kind: "video",
        url,
        previewUrl: str(rec.thumbnail_url),
        label: "GIF",
      });
    } else {
      media.push({
        kind: "video",
        url,
        previewUrl: str(rec.thumbnail_url),
        label: "Video",
      });
    }
  }
  const qrt = asRecord(data.qrt);
  const quote = qrt
    ? {
        name: String(qrt.user_name ?? qrt.name ?? "Unknown"),
        handle: String(qrt.user_screen_name ?? qrt.screen_name ?? "unknown").replace(
          /^@/,
          "",
        ),
        text: String(qrt.text ?? "").trim(),
        permalink: String(qrt.tweetURL ?? qrt.url ?? "").replace(
          "https://twitter.com",
          "https://x.com",
        ),
      }
    : undefined;
  const articleRaw = asRecord(data.article);
  const article = articleRaw ? fxArticle(articleRaw, text) : undefined;
  if (!text && !media.length && !article) return null;
  return {
    id,
    permalink,
    text,
    createdAt,
    author: { name, handle },
    likes: num(data.likes),
    reposts: num(data.retweets),
    replies: num(data.replies),
    media,
    quote,
    article,
    replyingToId: str(data.replyingToID),
    replyingToHandle: str(data.replyingTo)?.replace(/^@/, ""),
  };
}

function xApiToPost(
  tweet: Record<string, unknown>,
  includes: Record<string, unknown>,
): PostBody {
  const id = String(tweet.id ?? "");
  const users = asArray(includes.users);
  const mediaIncludes = asArray(includes.media);
  const authorId = String(tweet.author_id ?? "");
  const user =
    users
      .map((u) => asRecord(u))
      .find((u) => u && String(u.id) === authorId) ?? {};
  const handle = String(user.username ?? "unknown");
  const name = String(user.name ?? handle);
  const note = asRecord(tweet.note_tweet);
  const text = String(note?.text ?? tweet.text ?? "").trim();
  const metrics = asRecord(tweet.public_metrics) ?? {};
  const attachments = asRecord(tweet.attachments);
  const keys = asArray(attachments?.media_keys).map(String);
  const media: MediaItem[] = [];
  for (const item of mediaIncludes) {
    const rec = asRecord(item);
    if (!rec) continue;
    if (keys.length && !keys.includes(String(rec.media_key ?? ""))) continue;
    const type = String(rec.type ?? "");
    if (type === "photo") {
      const url = String(rec.url ?? "");
      if (url) media.push({ kind: "image", url, alt: String(rec.alt_text ?? "Image") });
    } else {
      const variants = asArray(rec.variants);
      const best = pickVariant(variants);
      const url = best || String(rec.preview_image_url ?? "");
      if (url) {
        media.push({
          kind: "video",
          url,
          previewUrl: str(rec.preview_image_url),
          label: type === "animated_gif" ? "GIF" : "Video",
        });
      }
    }
  }
  const referenced = asArray(tweet.referenced_tweets);
  let quote: QuotedPost | undefined;
  for (const ref of referenced) {
    const rec = asRecord(ref);
    if (!rec || rec.type !== "quoted") continue;
    const qid = String(rec.id ?? "");
    const quotedTweets = asArray(includes.tweets);
    const qt = quotedTweets.map((t) => asRecord(t)).find((t) => t && String(t.id) === qid);
    if (!qt) continue;
    const qAuthorId = String(qt.author_id ?? "");
    const qUser =
      users.map((u) => asRecord(u)).find((u) => u && String(u.id) === qAuthorId) ?? {};
    quote = {
      name: String(qUser.name ?? "Unknown"),
      handle: String(qUser.username ?? "unknown"),
      text: String(qt.text ?? "").trim(),
      permalink: canonicalPermalink(qid, String(qUser.username ?? "i")),
    };
  }
  return {
    id,
    permalink: canonicalPermalink(id, handle),
    text,
    createdAt: toIsoDate(str(tweet.created_at)) || "",
    author: { name, handle },
    likes: num(metrics.like_count),
    reposts: num(metrics.retweet_count),
    replies: num(metrics.reply_count),
    quotes: num(metrics.quote_count),
    bookmarks: num(metrics.bookmark_count),
    views: num(metrics.impression_count),
    media,
    quote,
  };
}

function pickVariant(variants: unknown[]): string {
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

function pickText(status: Record<string, unknown>): string {
  const raw = asRecord(status.raw_text);
  const note = asRecord(status.note_tweet);
  const candidates = [note?.text, raw?.text, status.text, status.full_text];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return "";
}

function mergePosts(main: PostBody, others: PostBody[]): PostBody[] {
  const map = new Map<string, PostBody>();
  map.set(main.id, main);
  for (const post of others) map.set(post.id, post);
  return [...map.values()];
}

async function maybeWalkParents(
  posts: PostBody[],
  fetchOne: (id: string) => Promise<PostBody | null>,
): Promise<PostBody[]> {
  if (posts.length > 1) return posts;
  const first = posts[0];
  if (!first?.replyingToId) return posts;
  if (
    first.replyingToHandle &&
    first.replyingToHandle.toLowerCase() !== first.author.handle.toLowerCase()
  ) {
    return posts;
  }
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

function parseJinaBody(body: string, id: string, handle?: string): PostBody {
  let text = body;
  const mdIndex = body.search(/markdown content:/i);
  if (mdIndex >= 0) {
    text = body.slice(mdIndex).replace(/markdown content:\s*/i, "");
  }
  text = text
    .replace(/^title:.*$/im, "")
    .replace(/^url source:.*$/im, "")
    .replace(/^published time:.*$/im, "")
    .replace(/^markdown content:\s*/im, "")
    .trim();
  const handleMatch = text.match(/@([A-Za-z0-9_]{1,15})/);
  const authorHandle = handle || handleMatch?.[1] || "unknown";
  return {
    id,
    permalink: canonicalPermalink(id, handle),
    text,
    createdAt: "",
    author: { name: authorHandle, handle: authorHandle },
    media: [],
  };
}

async function getJson(url: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const res = await fetchOk(url, undefined, signal);
  const data = (await res.json()) as unknown;
  if (!data || typeof data !== "object") throw new Error("invalid json");
  return data as Record<string, unknown>;
}

async function fetchOk(
  url: string,
  extraHeaders?: Record<string, string>,
  signal?: AbortSignal,
): Promise<Response> {
  const sourceTimeout = AbortSignal.timeout(SOURCE_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, sourceTimeout]) : sourceTimeout;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
        ...extraHeaders,
      },
      redirect: "follow",
      signal: combined,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    if (sourceTimeout.aborted) {
      const timeout = new Error("timeout");
      timeout.name = "TimeoutError";
      throw timeout;
    }
    throw err;
  }
  if (res.status === 401) {
    const body = await res.text().catch(() => "");
    if (/PRIVATE/i.test(body)) {
      throw new FatalExtractError(
        "private",
        "This post is private. Xtract only extracts public posts.",
        url,
      );
    }
    throw new Error(`HTTP 401`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function num(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
