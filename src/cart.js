// Contoso Cart — core pricing logic.

/**
 * Calculate the total price for a list of items.
 * Each item is { name, price, quantity }.
 */
export function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

const GIFT_WRAP_PRICE_PER_ITEM = 3.5;

/** Valid voucher codes mapped to their discount rate. */
export const VALID_VOUCHERS = new Map([
  ["SAVE10", 0.1],
  ["CONTOSO10", 0.1],
  ["SAVE50", 0.5],
]);

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
 * Apply a voucher code to a subtotal.
 * Returns { valid, discount, total }.
 *   valid    – true when the code is recognised
 *   discount – amount deducted (0 when invalid)
 *   total    – subtotal minus discount (10% off when valid)
 */
export function applyVoucher(subtotal, code) {
  const rate = VALID_VOUCHERS.get((code || "").trim().toUpperCase()) ?? 0;
  const valid = rate > 0;
  const discount = Math.round(subtotal * rate * 100) / 100;
  return { valid, discount, total: subtotal - discount };
}
