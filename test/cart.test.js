import { test } from "node:test";
import assert from "node:assert/strict";
import { cartTotal } from "../src/cart.js";

test("cartTotal sums price * quantity", () => {
  const items = [
    { name: "Coffee", price: 3, quantity: 2 },
    { name: "Mug", price: 10, quantity: 1 },
  ];
  assert.equal(cartTotal(items), 16);
});
