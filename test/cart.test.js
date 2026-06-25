import { test } from "node:test";
import assert from "node:assert/strict";
import { cartTotal, giftWrapFee } from "../src/cart.js";

test("cartTotal sums price * quantity", () => {
  const items = [
    { name: "Coffee", price: 3, quantity: 2 },
    { name: "Mug", price: 10, quantity: 1 },
  ];
  assert.equal(cartTotal(items), 16);
});

test("giftWrapFee returns 3.50 per item", () => {
  assert.equal(giftWrapFee(1), 3.5);
  assert.equal(giftWrapFee(3), 10.5);
  assert.equal(giftWrapFee(0), 0);
});
