import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.PASTEPOST_QA_URL ?? "http://127.0.0.1:8080";
const link = "https://x.com/test/status/1234567890123456789?s=20";
const result = {
  id: "1234567890123456789", kind: "post", source: "QA", permalink: link,
  author: { name: "QA Author", handle: "test" }, title: "Controlled shared post",
  date: "2026-10-13", posts: [], markdown: "Controlled shared post", extractedAt: Date.now(),
};
const browser = await chromium.launch({ headless: true, ...(process.env.PASTEPOST_QA_CHANNEL ? { channel: process.env.PASTEPOST_QA_CHANNEL } : {}) });
try {
  async function scenario(value, { cached = false, failure = false } = {}) {
    const context = await browser.newContext();
    await context.addInitScript(({ result, cached, failure }) => {
      if (!localStorage.getItem("qa.initialized")) {
        localStorage.setItem("pastepost.settings", JSON.stringify({ bearerToken: "qa-token" }));
        if (cached) localStorage.setItem("pastepost.history", JSON.stringify([result]));
        localStorage.setItem("qa.initialized", "true");
      }
      window.qaCalls = [];
      window.qaFailure = failure;
      window.qaResult = result;
    }, { result, cached, failure });
    // Stub the existing extraction boundary; all app validation, caching and UI remain real.
    await context.route(/\/src\/lib\/extract\/extract-fn\.ts(?:\?|$)/, (route) => route.fulfill({
      contentType: "application/javascript",
      body: `export async function extractPost({data}) {
        window.qaCalls.push(data);
        await new Promise(resolve => setTimeout(resolve, 100));
        if (window.qaFailure) throw new Error('controlled network failure');
        return {ok: true, result: window.qaResult};
      }`,
    }));
    const page = await context.newPage();
    const query = value === undefined ? "?keep=yes#anchor" : `?keep=yes&url=${encodeURIComponent(value)}#anchor`;
    await page.goto(base + "/" + query);
    await page.getByRole("textbox", { name: "X URL", exact: true }).waitFor();
    return { context, page };
  }
  for (const value of [link, link.replace("x.com", "twitter.com")]) {
    const { context, page } = await scenario(value);
    await page.getByLabel("Extract reader", { exact: true }).waitFor();
    assert.equal(await page.getByRole("textbox", { name: "X URL", exact: true }).inputValue(), value);
    assert.deepEqual(await page.evaluate(() => window.qaCalls), [{ input: value, bearerToken: "qa-token" }]);
    assert.equal(new URL(page.url()).search, "?keep=yes");
    assert.equal(new URL(page.url()).hash, "#anchor");
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("pastepost.history"))[0].id), result.id);
    await page.getByLabel("Extract reader", { exact: true }).getByRole("button", { name: "Vault", exact: true }).click();
    await page.getByLabel("Extract reader", { exact: true }).waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => window.qaCalls.length), 1);
    await page.reload();
    await page.getByRole("textbox", { name: "X URL", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.qaCalls.length), 0);
    assert.equal(await page.getByLabel("Extract reader", { exact: true }).count(), 0);
    await context.close();
  }
  {
    const { context, page } = await scenario(link, { cached: true });
    await page.getByLabel("Extract reader", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.qaCalls.length), 0);
    await context.close();
  }
  for (const [value, message] of [["not-a-link%20", "That doesn’t look like an X URL or status ID."], ["", "Paste an X URL or status ID."]]) {
    const { context, page } = await scenario(value);
    await page.getByText(message, { exact: true }).waitFor();
    assert.equal(await page.getByRole("textbox", { name: "X URL", exact: true }).inputValue(), value);
    assert.equal(await page.evaluate(() => window.qaCalls.length), 0);
    assert.equal(new URL(page.url()).searchParams.has("url"), false);
    await context.close();
  }
  {
    const { context, page } = await scenario(link, { failure: true });
    await page.getByText("Couldn’t reach this post. Try again, or paste the text.", { exact: true }).waitFor();
    await page.evaluate(() => { window.qaFailure = false; });
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await page.getByLabel("Extract reader", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.qaCalls.length), 2);
    await context.close();
  }
  {
    const { context, page } = await scenario(undefined);
    assert.equal(await page.getByRole("textbox", { name: "X URL", exact: true }).inputValue(), "");
    assert.equal(await page.evaluate(() => window.qaCalls.length), 0);
    assert.equal(new URL(page.url()).search, "?keep=yes");
    await context.close();
  }
  console.log("PASS: X/Twitter, settings hydration, exactly-once extraction, Vault save/cache, invalid/empty, Retry, close/reload, ordinary launch, query/fragment preservation");
} finally {
  await browser.close();
}
