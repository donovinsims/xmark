import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "../auth/middleware";
import { postId, vaultCursor, vaultEntry } from "./schema";

// This value only detects a cookie/account switch in another tab. SQL always
// uses the independently verified owner from authMiddleware.
const session = z.object({ expectedAccount: z.string().min(1) });
const withId = session.extend({ id: postId });

async function getStore(userId: string, expectedAccount: string) {
  if (expectedAccount !== userId) throw new Error("Your account changed. Sign in again.");
  const { dbSource, getSql } = await import("../db");
  if (process.env.VERCEL === "1" && (dbSource !== "neon" || !process.env.BETTER_AUTH_SECRET?.trim())) {
    throw new Error("Vault storage is unavailable.");
  }
  const { createVaultStore } = await import("./store.server");
  return createVaultStore((await getSql()).query, userId);
}

const vaultRequest = createServerFn({ method: "POST" }).middleware([authMiddleware]);

export const listVault = vaultRequest.validator(session.extend({
  filter: z.enum(["all", "favorites", "trash"]), query: z.string().trim().max(200), cursor: vaultCursor.optional(),
})).handler(async ({ data, context }) =>
  (await getStore(context.userId, data.expectedAccount)).list(data));

export const getVaultPost = vaultRequest.validator(withId).handler(async ({ data, context }) =>
  (await getStore(context.userId, data.expectedAccount)).get(data.id));

export const saveVaultPost = vaultRequest.validator(session.extend({ entry: vaultEntry }))
  .handler(async ({ data, context }) => ({
    added: await (await getStore(context.userId, data.expectedAccount)).save(data.entry),
  }));

export const changeVaultPost = vaultRequest.validator(withId.extend({
  action: z.enum(["favorite", "trash"]), value: z.boolean(),
})).handler(async ({ data, context }) => {
  const store = await getStore(context.userId, data.expectedAccount);
  return data.action === "favorite" ? store.setFavorite(data.id, data.value) : store.setTrash(data.id, data.value);
});

export const exportVaultPage = vaultRequest.validator(session.extend({ cursor: vaultCursor.optional() }))
  .handler(async ({ data, context }) =>
    (await getStore(context.userId, data.expectedAccount)).exportPage(data.cursor));
