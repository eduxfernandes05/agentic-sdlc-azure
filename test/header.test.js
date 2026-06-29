import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

test("header includes Menu and Social networks placeholders", () => {
  assert.match(html, /<header>[\s\S]*Menu[\s\S]*Social networks[\s\S]*<\/header>/);
  assert.ok(html.indexOf("<header>") < html.indexOf("<main>"));
});
