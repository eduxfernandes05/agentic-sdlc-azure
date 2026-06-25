import { test } from "node:test";
import assert from "node:assert/strict";
import { cartTotal, applyDiscount } from "../src/cart.js";

test("cartTotal sums price * quantity", () => {
  const items = [
    { name: "Coffee", price: 3, quantity: 2 },
    { name: "Mug", price: 10, quantity: 1 },
  ];
  assert.equal(cartTotal(items), 16);
});

test("applyDiscount applies 10% off with CONTOSO10", () => {
  assert.equal(applyDiscount(100, "CONTOSO10"), 90);
});

test("applyDiscount returns original total for invalid code", () => {
  assert.equal(applyDiscount(100, "INVALIDCODE"), 100);
});

test("applyDiscount returns original total when no code is given", () => {
  assert.equal(applyDiscount(100, undefined), 100);
});
