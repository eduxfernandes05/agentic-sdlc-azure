// Contoso Cart — core pricing logic.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Calculate the total price for a list of items.
 * Each item is { name, price, quantity }.
 */
export function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

const GIFT_WRAP_PRICE_PER_ITEM = 3.5;

function loadVoucherRates() {
  const configPath = join(dirname(fileURLToPath(import.meta.url)), "discount-codes.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  return new Map(
    Object.entries(config)
      .filter(([code, rate]) => typeof code === "string" && Number.isFinite(rate) && rate > 0 && rate < 1)
      .map(([code, rate]) => [code.trim().toUpperCase(), rate]),
  );
}

/** Valid voucher codes mapped to their discount rate. */
export const VALID_VOUCHERS = loadVoucherRates();

export function freeShipping(subtotal) {
  return subtotal > 50;
}

export function giftWrapFee(itemCount) {
  return itemCount * GIFT_WRAP_PRICE_PER_ITEM;
}

export function validateVoucherCode(code) {
  return typeof code === "string" && /^[A-Z0-9]{1,20}$/.test(code);
}

export function applyDiscount(total, code) {
  return applyVoucher(total, code).total;
}

/**
 * Remove all items from the cart array in-place.
 */
export function clearCart(items) {
  items.splice(0, items.length);
}

/**
 * Apply a voucher code to a subtotal.
 * Returns { valid, rate, discount, total }.
 *   valid    – true when the code is recognised
 *   rate     – discount rate applied (0 when invalid)
 *   discount – amount deducted (0 when invalid)
 *   total    – subtotal minus discount
 */
export function applyVoucher(subtotal, code) {
  const rate = VALID_VOUCHERS.get((code || "").trim().toUpperCase()) ?? 0;
  const valid = rate > 0;
  const discount = Math.round(subtotal * rate * 100) / 100;
  return { valid, rate, discount, total: subtotal - discount };
}

/**
 * Compute the order summary breakdown for an item list and optional voucher code.
 * Returns { subtotal, discount, total }.
 *   subtotal – sum of all item prices × quantities
 *   discount – amount deducted by voucher (0 when no valid voucher)
 *   total    – subtotal minus discount (always equals subtotal - discount)
 */
export function orderSummary(items, code) {
  const subtotal = cartTotal(items);
  const { discount, total } = applyVoucher(subtotal, code);
  return { subtotal, discount, total };
}
