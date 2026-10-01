import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMarkdown, downloadFilename, titleFromText, yamlValue } from "./markdown.ts";

test("frontmatter and thread separators", () => {
  const md = buildMarkdown({
    id: "20",
    kind: "thread",
    sourceName: "FxTwitter",
    permalink: "https://x.com/jack/status/20",
    author: { name: "jack", handle: "jack" },
    title: "just setting up my twttr",
    date: "2006-03-21T20:50:14.000Z",
    posts: [
      {
        id: "20",
        permalink: "https://x.com/jack/status/20",
        text: "just setting up my twttr",
        createdAt: "2006-03-21T20:50:14.000Z",
        author: { name: "jack", handle: "jack" },
        media: [],
      },
      {
        id: "21",
        permalink: "https://x.com/jack/status/21",
        text: "second",
        createdAt: "2006-03-21T20:51:14.000Z",
        author: { name: "jack", handle: "jack" },
        media: [{ kind: "image", url: "https://example.com/a.jpg", alt: "pic" }],
        quote: {
          name: "biz",
          handle: "biz",
          text: "quoted",
          permalink: "https://x.com/biz/status/1",
        },
      },
    ],
  });
  assert.match(md, /^---\n/);
  assert.match(md, /type: thread/);
  assert.match(md, /Post 1 of 2/);
  assert.match(md, /Post 2 of 2/);
  assert.match(md, /!\[pic\]\(https:\/\/example.com\/a.jpg\)/);
  assert.match(md, /> quoted/);
  assert.match(md, /\[source\]\(https:\/\/x.com\/biz\/status\/1\)/);
});

test("filename and title helpers", () => {
  assert.equal(downloadFilename("jack", "20"), "@jack-20.md");
  assert.equal(titleFromText("hello\nworld", "x").startsWith("hello"), true);
  assert.equal(yamlValue("a: b"), '"a: b"');
});
