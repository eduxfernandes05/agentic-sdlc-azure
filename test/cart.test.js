import { test } from "node:test";
import assert from "node:assert/strict";
import { cartTotal, freeShipping } from "../src/cart.js";

test("cartTotal sums price * quantity", () => {
  const items = [
    { name: "Coffee", price: 3, quantity: 2 },
    { name: "Mug", price: 10, quantity: 1 },
  ];
  assert.equal(cartTotal(items), 16);
});

test("freeShipping returns true only when subtotal exceeds 50", () => {
  assert.equal(freeShipping(50), false);
  assert.equal(freeShipping(50.01), true);
});
