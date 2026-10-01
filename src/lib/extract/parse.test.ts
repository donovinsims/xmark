import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInput } from "./parse.ts";

test("raw numeric id", () => {
  const parsed = parseInput("  20  ");
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.id, "20");
    assert.equal(parsed.canonical, "https://x.com/i/status/20");
  }
});

test("x.com status url with tracking", () => {
  const parsed = parseInput(
    "https://x.com/jack/status/20?s=20&t=abc&utm_source=share",
  );
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.id, "20");
    assert.equal(parsed.handle, "jack");
    assert.equal(parsed.canonical, "https://x.com/jack/status/20");
  }
});

test("twitter.com i/web/status", () => {
  const parsed = parseInput("https://twitter.com/i/web/status/20/");
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.id, "20");
    assert.equal(parsed.handle, undefined);
  }
});

test("mobile host and photo suffix", () => {
  const parsed = parseInput("https://mobile.twitter.com/jack/status/20/photo/1");
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.id, "20");
    assert.equal(parsed.handle, "jack");
  }
});

test("bare host path", () => {
  const parsed = parseInput("x.com/i/status/1234567890123456789");
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.id, "1234567890123456789");
});

test("rejects empty and non-x urls", () => {
  assert.equal(parseInput("").ok, false);
  assert.equal(parseInput("   ").ok, false);
  assert.equal(parseInput("https://example.com/20").ok, false);
  assert.equal(parseInput("not a link").ok, false);
});
