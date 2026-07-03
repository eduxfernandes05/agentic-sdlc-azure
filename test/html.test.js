import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, "../public/index.html"), "utf8");

test("index.html has lang='en' on <html> element", () => {
  assert.match(html, /<html[^>]*\slang="en"/);
});
