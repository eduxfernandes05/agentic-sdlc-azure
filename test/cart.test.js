import { test } from "node:test";
import assert from "node:assert/strict";
import { cartTotal, applyVoucher } from "../src/cart.js";

test("cartTotal sums price * quantity", () => {
  const items = [
    { name: "Coffee", price: 3, quantity: 2 },
    { name: "Mug", price: 10, quantity: 1 },
  ];
  assert.equal(cartTotal(items), 16);
});

test("applyVoucher applies 10% discount for SAVE10", () => {
  const { discountedTotal, discountAmount } = applyVoucher(100, "SAVE10");
  assert.equal(discountAmount, 10);
  assert.equal(discountedTotal, 90);
});

test("applyVoucher is case-insensitive", () => {
  const { discountedTotal, discountAmount } = applyVoucher(50, "save10");
  assert.equal(discountAmount, 5);
  assert.equal(discountedTotal, 45);
});

test("applyVoucher calculates correctly for non-round totals", () => {
  const { discountedTotal, discountAmount } = applyVoucher(16, "SAVE10");
  assert.equal(discountAmount, 1.6);
  assert.equal(discountedTotal, 14.4);
});

test("applyVoucher throws for invalid voucher code", () => {
  assert.throws(
    () => applyVoucher(100, "INVALIDCODE"),
    { message: 'Invalid or expired voucher code: "INVALIDCODE"' }
  );
});

test("applyVoucher throws for empty voucher code", () => {
  assert.throws(
    () => applyVoucher(100, ""),
    { message: 'Invalid or expired voucher code: ""' }
  );
});
