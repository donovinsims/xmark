export type ExtractKind = "post" | "thread" | "article";

export type MediaItem =
  | { kind: "image"; url: string; alt: string }
  | { kind: "video"; url: string; previewUrl?: string; label: "Video" | "GIF" };

export type QuotedPost = {
  name: string;
  handle: string;
  text: string;
  permalink: string;
};

export type ArticleBody = {
  title: string;
  markdown: string;
};

export type Author = {
  name: string;
  handle: string;
};

export type PostBody = {
  id: string;
  permalink: string;
  text: string;
  createdAt: string;
  author: Author;
  likes?: number;
  reposts?: number;
  replies?: number;
  quotes?: number;
  bookmarks?: number;
  views?: number;
  media: MediaItem[];
  quote?: QuotedPost;
  article?: ArticleBody;
  replyingToId?: string;
  replyingToHandle?: string;
};

export type ExtractResult = {
  id: string;
  kind: ExtractKind;
  source: string;
  permalink: string;
  author: Author;
  title: string;
  date: string;
  posts: PostBody[];
  markdown: string;
  extractedAt: number;
};

export type ExtractErrorCode = "gone" | "private" | "invalid" | "network" | "empty";

export type ExtractError = {
  code: ExtractErrorCode;
  message: string;
  tried: string[];
};

export type ExtractResponse =
  | { ok: true; result: ExtractResult }
  | { ok: false; error: ExtractError };

export type ParsedInput =
  | { ok: true; id: string; handle?: string; canonical: string }
  | { ok: false; reason: "empty" | "invalid" };
