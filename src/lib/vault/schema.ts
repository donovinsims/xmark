import { z } from "zod";

export const postId = z.string().regex(/^\d{1,20}$/);
const author = z.object({ name: z.string(), handle: z.string() });
const media = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("image"), url: z.string(), alt: z.string() }),
  z.object({ kind: z.literal("video"), url: z.string(), previewUrl: z.string().optional(), label: z.enum(["Video", "GIF"]) }),
]);
const post = z.object({
  id: postId, permalink: z.string(), text: z.string(), createdAt: z.string(), author,
  likes: z.number().optional(), reposts: z.number().optional(), replies: z.number().optional(),
  quotes: z.number().optional(), bookmarks: z.number().optional(), views: z.number().optional(),
  media: z.array(media), quote: z.object({ ...author.shape, text: z.string(), permalink: z.string() }).optional(),
  article: z.object({ title: z.string(), markdown: z.string() }).optional(),
  replyingToId: z.string().optional(), replyingToHandle: z.string().optional(),
});

export const extractResult = z.object({
  id: postId, kind: z.enum(["post", "article", "thread"]), source: z.string(),
  permalink: z.string(), author, title: z.string(), date: z.string(), posts: z.array(post),
  markdown: z.string(), extractedAt: z.number().int().min(0).max(8_640_000_000_000_000),
  saved: z.boolean().optional(),
});

export const vaultEntry = z.object({ result: extractResult, favorite: z.boolean(), trashed: z.boolean() });
export const vaultCursor = z.object({ at: extractResult.shape.extractedAt, id: postId });
