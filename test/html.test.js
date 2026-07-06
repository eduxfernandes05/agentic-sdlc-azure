import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

test("logo h1 has title attribute", () => {
  assert.match(html, /<h1[^>]*title="Contoso Cart"/);
});

test("page has a meta description", () => {
  assert.match(html, /<meta name="description" content="[^"]+" \/>/);
});

test("page has a favicon", () => {
  assert.match(html, /<link rel="icon"/);
});

test("index.html has lang='en' on <html> element", () => {
  assert.match(html, /<html[^>]*\slang="en"/);
});
