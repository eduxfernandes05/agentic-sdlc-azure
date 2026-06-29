import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

test("header includes Menu and Social networks placeholders", () => {
  const headerStart = html.indexOf("<header>");
  const headerEnd = html.indexOf("</header>");

  assert.ok(headerStart >= 0);
  assert.ok(headerEnd > headerStart);

  const headerHtml = html.slice(headerStart, headerEnd);
  assert.match(headerHtml, /aria-label="Menu"/);
  assert.match(headerHtml, /aria-label="Social networks"/);
  assert.ok(headerStart < html.indexOf("<main>"));
});
