import type {
  Author,
  ExtractKind,
  ExtractResult,
  MediaItem,
  PostBody,
  QuotedPost,
} from "./types";

export function buildMarkdown(input: {
  id: string;
  kind: ExtractKind;
  sourceName: string;
  permalink: string;
  author: Author;
  title: string;
  date: string;
  posts: PostBody[];
}): string {
  const { kind, permalink, author, title, date, posts } = input;
  const lines: string[] = [
    "---",
    `title: ${yamlValue(title)}`,
    `author: ${yamlValue(`${author.name} (@${author.handle})`)}`,
    ...(date ? [`date: ${yamlValue(date)}`] : []),
    `source: ${permalink}`,
    `type: ${kind}`,
    "---",
    "",
  ];

  if (kind === "article" && posts[0]?.article) {
    const article = posts[0].article;
    if (article.title) {
      lines.push(`# ${article.title}`, "");
    }
    if (posts[0].media.length) {
      lines.push(...mediaMarkdown(posts[0].media), "");
    }
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

export function postToMarkdown(post: PostBody): string[] {
  const out: string[] = [];
  const text = post.text.trim();
  if (text) out.push(text, "");
  if (post.quote) {
    out.push(...quoteToMarkdown(post.quote), "");
  }
  if (post.article) {
    if (post.article.title) out.push(`# ${post.article.title}`, "");
    out.push(post.article.markdown.trim(), "");
  }
  if (post.media.length) {
    out.push(...mediaMarkdown(post.media), "");
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  out.push("");
  return out;
}

export function quoteToMarkdown(quote: QuotedPost): string[] {
  const quoted = quote.text.trim() || "(quoted post has no text)";
  const body = quoted.split("\n").map((line) => (line ? `> ${line}` : ">"));
  body.push(">");
  body.push(
    `> — ${quote.name} (@${quote.handle}), [source](${quote.permalink})`,
  );
  return body;
}

export function mediaMarkdown(media: MediaItem[]): string[] {
  return media.map((item) => {
    if (item.kind === "image") {
      const alt = item.alt || "Image";
      return `![${alt}](${item.url})`;
    }
    return `[${item.label}](${item.url})`;
  });
}

export function titleFromText(text: string, fallback: string): string {
  const first = text
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!first) return fallback;
  const collapsed = first.replace(/\s+/g, " ");
  return collapsed.length > 80 ? `${collapsed.slice(0, 77).trimEnd()}...` : collapsed;
}

export function toIsoDate(value: string | number | undefined | null): string {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function downloadFilename(handle: string, id: string): string {
  const safe = (handle || "unknown").replace(/[^A-Za-z0-9_]/g, "") || "unknown";
  const safeId = id.replace(/[^\d]/g, "") || "post";
  return `@${safe}-${safeId}.md`;
}

export function yamlValue(value: string): string {
  if (value === "") return '""';
  if (/[:#{}[\],&*?|>!%@`'"]/.test(value) || /^\s|\s$/.test(value) || /\n/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

export function bodyTextFromMarkdown(markdown: string): string {
  return markdown.replace(/^---[\s\S]*?---\s*/, "").trim();
}

export function plainTextFromPosts(posts: PostBody[]): string {
  return posts
    .map((post) => {
      const parts = [post.text.trim()];
      if (post.quote) parts.push(`“${post.quote.text.trim()}” — ${post.quote.name} (@${post.quote.handle})`);
      if (post.article) parts.push(post.article.title, post.article.markdown);
      return parts.filter(Boolean).join("\n\n");
    })
    .join("\n\n")
    .trim();
}

export function draftJsToMarkdown(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (typeof content !== "object") return "";
  const record = content as {
    blocks?: unknown;
    entityMap?: Record<string, DraftEntity>;
    markdown?: unknown;
  };
  if (typeof record.markdown === "string" && record.markdown.trim()) {
    return record.markdown;
  }
  const blocks = Array.isArray(record.blocks) ? record.blocks : [];
  const entityMap = record.entityMap ?? {};
  const out: string[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!listBuffer) return;
    listBuffer.items.forEach((item, i) => {
      out.push(listBuffer!.ordered ? `${i + 1}. ${item}` : `- ${item}`);
    });
    out.push("");
    listBuffer = null;
  };

  for (const rawBlock of blocks) {
    if (!rawBlock || typeof rawBlock !== "object") continue;
    const block = rawBlock as DraftBlock;
    const type = block.type || "unstyled";
    const text = applyInline(block, entityMap);

    if (type === "unordered-list-item" || type === "ordered-list-item") {
      const ordered = type === "ordered-list-item";
      if (!listBuffer || listBuffer.ordered !== ordered) {
        flushList();
        listBuffer = { ordered, items: [] };
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
        out.push(
          ...(text.split("\n").map((line) => `> ${line}`) as string[]),
          "",
        );
        break;
      case "code-block":
        out.push("```", text, "```", "");
        break;
      case "atomic": {
        const atomic = atomicMarkdown(block, entityMap);
        if (atomic) out.push(atomic, "");
        break;
      }
      default:
        if (text.trim()) out.push(text, "");
        else out.push("");
    }
  }
  flushList();
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

type DraftEntity = {
  type?: string;
  mutability?: string;
  data?: Record<string, unknown>;
};

type DraftBlock = {
  text?: string;
  type?: string;
  inlineStyleRanges?: { offset: number; length: number; style: string }[];
  entityRanges?: { offset: number; length: number; key: number | string }[];
};

function applyInline(block: DraftBlock, entityMap: Record<string, DraftEntity>): string {
  const text = block.text ?? "";
  if (!text) return "";
  type Marker = { index: number; open: string; close: string; order: number };
  const markers: Marker[] = [];
  let order = 0;

  for (const range of block.inlineStyleRanges ?? []) {
    const wrap =
      range.style === "BOLD"
        ? ["**", "**"]
        : range.style === "ITALIC"
          ? ["*", "*"]
          : range.style === "CODE"
            ? ["`", "`"]
            : null;
    if (!wrap) continue;
    markers.push({
      index: range.offset,
      open: wrap[0]!,
      close: "",
      order: order++,
    });
    markers.push({
      index: range.offset + range.length,
      open: "",
      close: wrap[1]!,
      order: order++,
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
      order: order++,
    });
    markers.push({
      index: range.offset + range.length,
      open: "",
      close: `](${href})`,
      order: order++,
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

function entityHref(entity: DraftEntity): string | null {
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

function atomicMarkdown(block: DraftBlock, entityMap: Record<string, DraftEntity>): string {
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

export function resultFromPaste(input: {
  text: string;
  parsedId?: string;
  parsedHandle?: string;
  canonical?: string;
}): ExtractResult {
  const text = input.text.trim();
  const id = input.parsedId || "pasted";
  const handle = input.parsedHandle || "unknown";
  const name = handle === "unknown" ? "Unknown" : handle;
  const permalink = input.canonical || "";
  const title = titleFromText(text, "Pasted post");
  const posts: PostBody[] = [
    {
      id,
      permalink,
      text,
      createdAt: "",
      author: { name, handle },
      media: [],
    },
  ];
  const markdown = buildMarkdown({
    id,
    kind: "post",
    sourceName: "Pasted text",
    permalink: permalink || "pasted",
    author: { name, handle },
    title,
    date: "",
    posts,
  });
  return {
    id,
    kind: "post",
    source: "Pasted text",
    permalink,
    author: { name, handle },
    title,
    date: "",
    posts,
    markdown,
    extractedAt: Date.now(),
  };
}

export function toResult(input: {
  id: string;
  source: string;
  posts: PostBody[];
  permalink?: string;
}): ExtractResult {
  const posts = [...input.posts].sort((a, b) => {
    const da = a.createdAt ? Date.parse(a.createdAt) : 0;
    const db = b.createdAt ? Date.parse(b.createdAt) : 0;
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });
  const first = posts[0]!;
  const hasArticle = posts.some((p) => p.article);
  const kind: ExtractKind = hasArticle ? "article" : posts.length > 1 ? "thread" : "post";
  const author = first.author;
  const title = hasArticle
    ? posts.find((p) => p.article)?.article?.title || titleFromText(first.text, first.id)
    : titleFromText(first.text, first.id);
  const permalink =
    input.permalink || first.permalink || `https://x.com/${author.handle}/status/${input.id}`;
  const date = first.createdAt;
  const markdown = buildMarkdown({
    id: input.id,
    kind,
    sourceName: input.source,
    permalink,
    author,
    title,
    date,
    posts,
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
    extractedAt: Date.now(),
  };
}
