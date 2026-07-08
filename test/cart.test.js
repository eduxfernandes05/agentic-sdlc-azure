import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cartTotal, applyDiscount, applyVoucher, freeShipping, giftWrapFee, validateVoucherCode, clearCart, orderSummary, VALID_VOUCHERS } from "../src/cart.js";

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

test("applyVoucher supports SAVE50 for a 50% discount", () => {
  const result = applyVoucher(100, "SAVE50");
  assert.equal(result.valid, true);
  assert.equal(result.discount, 50);
  assert.equal(result.total, 50);
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

test("discount codes are loaded from configuration file", () => {
  const config = JSON.parse(readFileSync(new URL("../src/discount-codes.json", import.meta.url), "utf8"));
  assert.equal(config.SAVE10, 0.1);
});

test("VALID_VOUCHERS includes configured discount codes", () => {
  assert.equal(VALID_VOUCHERS.get("SAVE10"), 0.1);
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

test("applyDiscount returns discounted total for compatible callers", () => {
  assert.equal(applyDiscount(100, "CONTOSO10"), 90);
  assert.equal(applyDiscount(100, "UNKNOWN"), 100);
});

test("freeShipping returns true only when subtotal exceeds 50", () => {
  assert.equal(freeShipping(50), false);
  assert.equal(freeShipping(50.01), true);
});

test("giftWrapFee returns 3.50 per item", () => {
  assert.equal(giftWrapFee(1), 3.5);
  assert.equal(giftWrapFee(3), 10.5);
  assert.equal(giftWrapFee(0), 0);
});

test("validateVoucherCode accepts uppercase alphanumeric voucher codes only", () => {
  assert.equal(validateVoucherCode("SAVE10"), true);
  assert.equal(validateVoucherCode(""), false);
  assert.equal(validateVoucherCode("save10"), false);
  assert.equal(validateVoucherCode("SAVE 10"), false);
  assert.equal(validateVoucherCode(null), false);
});

test("index.html renders product images with descriptive alt text", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.ok(html.includes('alt="${i.name}"'));
});

test("index main container has role main", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /<main\b[^>]*\brole=["']main["'][^>]*>/);
});

test("index.html has an empty-cart state element", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /id=["']empty-cart["']/);
});

test("empty-cart state is hidden by default", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /id="empty-cart"[^>]*style="[^"]*display\s*:\s*none/);
});

test("empty-cart state contains a Continue shopping link", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /Continue shopping/);
});

test("cart render toggles empty-cart visibility based on items length", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /empty-cart/);
  assert.match(html, /items\.length/);
});

test("clearCart empties the items array", () => {
  const items = [
    { name: "Coffee", price: 3, quantity: 2 },
    { name: "Mug", price: 10, quantity: 1 },
  ];
  clearCart(items);
  assert.equal(items.length, 0);
});

test("clearCart on an already-empty array is safe", () => {
  const items = [];
  clearCart(items);
  assert.equal(items.length, 0);
});

test("index.html has a clear-cart button", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.ok(html.includes('id="clear-cart"'));
});

test("index.html clear-cart handler shows a confirm dialog before clearing", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.ok(html.includes("confirm("));
});

test("index.html clear-cart handler calls DELETE /api/cart on confirmation", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.ok(html.includes('method: "DELETE"'));
  assert.ok(html.includes('"/api/cart"'));
});

test("index.html checkout includes a discount code input", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /placeholder="Discount code \(e\.g\. SAVE10\)"/);
});

test("index.html shows a clear invalid discount code message", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.ok(html.includes("Invalid discount code."));
});

test("orderSummary: no-discount case has discount=0 and total equals subtotal", () => {
  const items = [
    { name: "Coffee", price: 3, quantity: 2 },
    { name: "Mug", price: 10, quantity: 1 },
  ];
  const summary = orderSummary(items);
  assert.equal(summary.subtotal, 16);
  assert.equal(summary.discount, 0);
  assert.equal(summary.total, 16);
  assert.equal(summary.subtotal - summary.discount, summary.total);
});

test("orderSummary: subtotal minus discount equals total when voucher applied", () => {
  const items = [
    { name: "Coffee", price: 3, quantity: 2 },
    { name: "Mug", price: 10, quantity: 1 },
  ];
  const summary = orderSummary(items, "SAVE10");
  assert.equal(summary.subtotal, 16);
  assert.equal(summary.discount, 1.6);
  assert.equal(summary.total, 14.4);
  assert.equal(summary.subtotal - summary.discount, summary.total);
});
