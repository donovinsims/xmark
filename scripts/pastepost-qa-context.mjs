import { randomUUID } from "node:crypto";

export const qaBase = process.env.PASTEPOST_QA_URL ?? "http://localhost:8080";

export async function createQaSession(context) {
  if (!["localhost", "127.0.0.1"].includes(new URL(qaBase).hostname)) {
    throw new Error("Use an isolated local PastePost server for this smoke test.");
  }
  const response = await context.request.post(`${qaBase}/api/auth/sign-up/email`, {
    headers: { origin: new URL(qaBase).origin },
    data: { email: `qa-${randomUUID()}@example.com`, name: "QA Fixture", password: "Local-test-only-24" },
  });
  if (!response.ok()) throw new Error(`Couldn’t create the QA session (HTTP ${response.status()})`);
}

export async function seedQaVault(page, result) {
  await page.goto(qaBase);
  await page.getByRole("textbox", { name: "X URL", exact: true }).waitFor();
  const added = await page.evaluate(async (item) => {
    const session = await fetch("/api/auth/get-session").then((response) => response.json());
    const { saveVaultPost } = await import("/src/lib/vault/vault-fns.ts");
    return saveVaultPost({
      data: { expectedAccount: session.user.id, entry: { result: item, favorite: false, trashed: false } },
    });
  }, result);
  if (!added.added) throw new Error("Couldn’t seed the QA Vault");
}
