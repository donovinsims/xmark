import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const post = "https://x.com/test/status/1234567890123456789";
  await page.goto(`http://127.0.0.1:8084/?url=${encodeURIComponent(post)}&keep=yes#launch`);
  const diagnostic = page.locator("details").filter({ hasText: "Shortcut launch diagnostic" });
  await diagnostic.locator("summary").click();
  await diagnostic.getByText(`Received post: ${post}`, { exact: true }).waitFor();
  await page.waitForFunction(() => !new URL(location.href).searchParams.has("url"));
  assert.equal(new URL(page.url()).searchParams.get("keep"), "yes");
  assert.equal(new URL(page.url()).hash, "#launch");
  for (let i = 0; i < 9; i++) await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  assert.match(await diagnostic.innerText(), /Page opened/);
  assert.match(await diagnostic.innerText(), /Received post: https:\/\/x.com\/test\/status/);
  assert.match(await diagnostic.innerText(), /App focused/);
  await page.goto("http://127.0.0.1:8084/");
  await page.locator("summary").filter({ hasText: "Shortcut launch diagnostic" }).click();
  await page.getByText("Received post: No url parameter", { exact: true }).first().waitFor();
  console.log("PASS: initial URL survives parameter consumption and repeated focus; plain launches show no parameter.");
} finally {
  await browser.close();
}
