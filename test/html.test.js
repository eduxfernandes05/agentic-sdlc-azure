import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, "../public/index.html"), "utf8");

test("logo h1 has title attribute 'Contoso Cart'", () => {
  assert.match(html, /<h1[^>]*title="Contoso Cart"/);
});
