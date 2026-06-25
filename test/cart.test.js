import { test } from "node:test";
import assert from "node:assert/strict";
import { cartTotal, validateVoucher, applyVoucher } from "../src/cart.js";

test("cartTotal sums price * quantity", () => {
  const items = [
    { name: "Coffee", price: 3, quantity: 2 },
    { name: "Mug", price: 10, quantity: 1 },
  ];
  assert.equal(cartTotal(items), 16);
});

test("validateVoucher returns true for valid code", () => {
  assert.equal(validateVoucher("SAVE50"), true);
});

test("validateVoucher returns false for invalid code", () => {
  assert.equal(validateVoucher("INVALID"), false);
  assert.equal(validateVoucher(""), false);
  assert.equal(validateVoucher("save50"), false);
});

test("applyVoucher applies 50% discount for valid voucher", () => {
  const result = applyVoucher(100, "SAVE50");
  assert.equal(result.total, 50);
  assert.equal(result.error, null);
});

test("applyVoucher returns error and original total for invalid voucher", () => {
  const result = applyVoucher(100, "WRONGCODE");
  assert.equal(result.total, 100);
  assert.equal(result.error, "Voucher inválido.");
});

test("applyVoucher works correctly with cartTotal", () => {
  const items = [
    { name: "Coffee", price: 3, quantity: 2 },
    { name: "Mug", price: 10, quantity: 1 },
  ];
  const total = cartTotal(items); // 16
  const result = applyVoucher(total, "SAVE50");
  assert.equal(result.total, 8);
  assert.equal(result.error, null);
});
