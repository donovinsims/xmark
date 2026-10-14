import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const link = "https://x.com/test/status/1234567890123456789";
const result = { id: "1234567890123456789", kind: "post", source: "QA", permalink: link, author: { name: "QA", handle: "test" }, title: "Clipboard post", date: "2026-10-13", posts: [], markdown: "Clipboard post", extractedAt: Date.now() };
try {
  for (const mode of ["success", "cached", "empty", "invalid", "denied"]) {
    const context = await browser.newContext();
    await context.addInitScript(({ mode, link, result }) => {
      window.qaReads = 0;
      window.qaCalls = [];
      window.qaResult = result;
      if (mode === "cached") localStorage.setItem("pastepost.history", JSON.stringify([result]));
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
        readText: async () => {
          window.qaReads++;
          if (mode === "denied") throw new Error("denied");
          await new Promise((resolve) => setTimeout(resolve, 100));
          return mode === "empty" ? "" : mode === "invalid" ? "not a post" : link;
        },
      } });
    }, { mode, link, result });
    await context.route(/\/src\/lib\/extract\/extract-fn\.ts(?:\?|$)/, route => route.fulfill({ contentType: "application/javascript", body: "export async function extractPost({data}) { window.qaCalls.push(data); return {ok:true,result:window.qaResult}; }" }));
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:8084/");
    const button = page.getByRole("button", { name: "Paste & Extract", exact: true });
    await button.waitFor();
    assert.equal(await page.evaluate(() => window.qaReads), 0);
    await button.click();
    if (mode === "success" || mode === "cached") {
      await page.getByLabel("Extract reader", { exact: true }).waitFor();
      assert.equal(await page.getByRole("textbox", { name: "X URL", exact: true }).inputValue(), link);
      assert.equal(await page.evaluate(() => window.qaCalls.length), mode === "cached" ? 0 : 1);
    } else {
      const message = mode === "empty" ? "Paste an X URL or status ID." : mode === "invalid" ? "That doesn’t look like an X URL or status ID." : "Couldn’t read the clipboard. Touch and hold the input, choose Paste, then tap Extract.";
      await page.getByText(message, { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.qaCalls.length), 0);
    }
    assert.equal(await page.evaluate(() => window.qaReads), 1);
    await context.close();
  }
  console.log("PASS: no automatic clipboard access; success, cached, empty, invalid, denied access; exactly one clipboard read per tap.");
} finally { await browser.close(); }
