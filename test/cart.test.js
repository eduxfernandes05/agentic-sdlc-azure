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

test("applyVoucher returns valid=true and 10% discount for SAVE10", () => {
  const result = applyVoucher(100, "SAVE10");
  assert.equal(result.valid, true);
  assert.equal(result.discount, 10);
  assert.equal(result.total, 90);
});

test("applyVoucher returns valid=true and 10% discount for CONTOSO10", () => {
  const result = applyVoucher(50, "CONTOSO10");
  assert.equal(result.valid, true);
  assert.equal(result.discount, 5);
  assert.equal(result.total, 45);
});

test("applyVoucher is case-insensitive", () => {
  const result = applyVoucher(100, "save10");
  assert.equal(result.valid, true);
  assert.equal(result.discount, 10);
});

test("applyVoucher trims whitespace from code", () => {
  const result = applyVoucher(100, "  SAVE10  ");
  assert.equal(result.valid, true);
});

test("applyVoucher returns valid=false and zero discount for unknown code", () => {
  const result = applyVoucher(100, "INVALID");
  assert.equal(result.valid, false);
  assert.equal(result.discount, 0);
  assert.equal(result.total, 100);
});

test("applyVoucher handles empty code gracefully", () => {
  const result = applyVoucher(100, "");
  assert.equal(result.valid, false);
  assert.equal(result.discount, 0);
  assert.equal(result.total, 100);
});

test("applyVoucher handles null/undefined code gracefully", () => {
  assert.equal(applyVoucher(100, null).valid, false);
  assert.equal(applyVoucher(100, undefined).valid, false);
});
