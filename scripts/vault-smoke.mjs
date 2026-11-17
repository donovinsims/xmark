import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { chromium } from "playwright";

const base = process.env.PASTEPOST_QA_URL ?? "http://localhost:8080";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) {
  throw new Error("Run this test against an isolated local PastePost dev server.");
}
const email = `qa-${randomUUID()}@example.com`;
const password = "Local-test-only-24";
const url = (id) => `https://x.com/example/status/${id}`;
const post = (id, title, when) => ({
  id, title, permalink: url(id), kind: "article", source: "QA fixture",
  author: { name: "Example", handle: "example" }, date: "2025-11-05",
  posts: [], markdown: `# ${title}\n\nFull article body for ${id}.\n`, extractedAt: when,
});
const old = post("901", "November article", Date.UTC(2025, 10, 5));
const browser = await chromium.launch({ headless: true, channel: process.env.PASTEPOST_QA_CHANNEL ?? "chrome" });

async function signIn(page, account, create = false) {
  if (create) await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Email", { exact: true }).fill(account);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: create ? "Create account" : "Sign in", exact: true }).click();
  await page.getByRole("textbox", { name: "X URL", exact: true }).waitFor();
}

const nav = (page) => page.getByRole("navigation", { name: "Main navigation" });
const read = (page) => page.getByRole("dialog", { name: "Extract reader" });
async function download(page, action) {
  const [file] = await Promise.all([page.waitForEvent("download"), action.click()]);
  return readFile(await file.path());
}

try {
  const first = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await first.addInitScript((item) => {
    if (!localStorage.getItem("pastepost.history")) localStorage.setItem("pastepost.history", JSON.stringify([item]));
  }, old);
  await first.route(/\/src\/lib\/extract\/extract-fn\.ts(?:\?|$)/, (route) => route.fulfill({
    contentType: "application/javascript",
    body: `
      const post = ${post.toString()};
      const url = ${url.toString()};
      export async function extractPost({ data }) {
        const id = data.input.split('/').at(-1);
        return { ok: true, result: post(id, "Extracted article " + id, Date.now()) };
      }
    `,
  }));

  const page = await first.newPage();
  await page.goto(`${base}/?url=${encodeURIComponent(url("902"))}`);
  await signIn(page, email, true);
  await read(page).getByText("Saved to Vault", { exact: true }).waitFor();
  await read(page).getByRole("button", { name: "Vault", exact: true }).click();
  await nav(page).getByRole("button", { name: "Vault" }).click();
  await page.getByRole("button", { name: "Recover from this browser" }).click();
  await page.getByRole("button", { name: "Merge posts" }).click();
  await page.getByText("November article", { exact: true }).waitFor();
  await nav(page).getByRole("button", { name: "Extract" }).click();

  // Block one Vault write while letting the next extraction and save succeed.
  let block = true;
  let blocked = 0;
  await first.route("**/_serverFn/**", (route) => {
    const body = route.request().postData() ?? "";
    if (block && body.includes("Full article body for 903.")) {
      blocked++;
      return route.abort("failed");
    }
    return route.continue();
  });
  await page.getByRole("button", { name: "Bulk", exact: true }).click();
  await page.getByRole("textbox", { name: "Bulk URLs or status IDs" }).fill(`${url("903")}\n${url("904")}`);
  await page.getByRole("button", { name: "Extract 2" }).click();
  await page.getByText(/2 extracted this run/).waitFor();
  await page.getByText(/1 post is not synced/).waitFor();
  assert.ok(blocked > 0);
  await page.reload();
  await page.getByText(/1 post is not synced/).waitFor();
  block = false;
  await page.getByRole("button", { name: "Retry saves" }).click();
  await page.getByText(/1 post is not synced/).waitFor({ state: "hidden" });

  const another = await browser.newContext();
  const anotherPage = await another.newPage();
  await anotherPage.goto(base);
  await signIn(anotherPage, email);
  await nav(anotherPage).getByRole("button", { name: "Vault" }).click();
  await anotherPage.getByText("Extracted article 903", { exact: true }).waitFor();
  await anotherPage.getByText("Extracted article 904", { exact: true }).waitFor();
  await anotherPage.getByText("November article", { exact: true }).click();
  await read(anotherPage).getByText("Full article body for 901.", { exact: true }).waitFor();
  const oldMarkdown = await download(anotherPage, read(anotherPage).getByRole("button", { name: "Download Markdown" }));
  assert.equal(oldMarkdown.toString(), old.markdown);
  await read(anotherPage).getByRole("button", { name: "Vault", exact: true }).click();

  const zipBuffer = await download(anotherPage, anotherPage.getByRole("button", { name: "Export entire Vault" }));
  const files = unzipSync(zipBuffer);
  assert.deepEqual(Object.keys(files).filter((key) => key.startsWith("posts/")).sort(),
    ["posts/901.json", "posts/902.json", "posts/903.json", "posts/904.json"]);
  assert.equal(JSON.parse(strFromU8(files["posts/901.json"])).result.markdown, old.markdown);

  const isolated = await browser.newContext();
  const isolatedPage = await isolated.newPage();
  await isolatedPage.goto(base);
  await signIn(isolatedPage, `qa-${randomUUID()}@example.com`, true);
  await nav(isolatedPage).getByRole("button", { name: "Vault" }).click();
  await isolatedPage.getByText("Extract a post to start your Vault").waitFor();
  assert.equal(await isolatedPage.getByText("November article", { exact: true }).count(), 0);
  await isolatedPage.locator('input[type="file"]').setInputFiles({ name: "pastepost-vault.zip", mimeType: "application/zip", buffer: zipBuffer });
  await isolatedPage.getByRole("button", { name: "Merge posts" }).click();
  await isolatedPage.getByText(/Imported 4/).waitFor();
  await isolatedPage.getByText("November article", { exact: true }).waitFor();
  console.log("PASS: shared URL through sign-in, automatic bulk saves, retry after reload, older article recovery, account isolation, individual Markdown and whole-Vault ZIP restore");
} finally {
  await browser.close();
}
