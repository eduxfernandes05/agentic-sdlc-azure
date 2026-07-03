import { test } from "node:test";
import assert from "node:assert/strict";
import { cartTotal } from "../src/cart.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

test("cartTotal sums price * quantity", () => {
  const items = [
    { name: "Coffee", price: 3, quantity: 2 },
    { name: "Mug", price: 10, quantity: 1 },
  ];
  assert.equal(cartTotal(items), 16);
});

test("index.html renders product images with descriptive alt text", () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const html = readFileSync(join(__dirname, "../public/index.html"), "utf8");
  // The template should include alt="${i.name}" to give each image a descriptive label
  assert.ok(
    html.includes('alt="${i.name}"'),
    'product image template must include alt="${i.name}"'
  );
});
