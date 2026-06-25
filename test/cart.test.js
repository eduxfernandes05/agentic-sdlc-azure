import { test } from "node:test";
import assert from "node:assert/strict";
import { cartTotal, applyVoucher, validateVoucherCode } from "../src/cart.js";

test("cartTotal sums price * quantity", () => {
  const items = [
    { name: "Coffee", price: 3, quantity: 2 },
    { name: "Mug", price: 10, quantity: 1 },
  ];
  assert.equal(cartTotal(items), 16);
});

test("applyVoucher applies 10% discount with SAVE10 code", () => {
  const items = [
    { name: "Coffee", price: 3, quantity: 2 },
    { name: "Mug", price: 10, quantity: 1 },
  ];
  const subtotal = cartTotal(items); // 16
  assert.equal(applyVoucher(subtotal, "SAVE10"), 14.4);
});

test("validateVoucherCode rejects invalid voucher codes", () => {
  assert.equal(validateVoucherCode(""), false);
  assert.equal(validateVoucherCode("save10"), false);
  assert.equal(validateVoucherCode("SAVE 10"), false);
  assert.equal(validateVoucherCode(null), false);
  assert.equal(validateVoucherCode("SAVE10"), true);
});
