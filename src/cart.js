// Contoso Cart — core pricing logic.

/**
 * Calculate the total price for a list of items.
 * Each item is { name, price, quantity }.
 */
export function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/** Valid voucher codes that each grant a 10% discount. */
export const VALID_VOUCHERS = new Set(["SAVE10", "CONTOSO10"]);

/**
 * Apply a voucher code to a subtotal.
 * Returns { valid, discount, total }.
 *   valid    – true when the code is recognised
 *   discount – amount deducted (0 when invalid)
 *   total    – subtotal minus discount (10% off when valid)
 */
export function applyVoucher(subtotal, code) {
  const valid = VALID_VOUCHERS.has((code || "").trim().toUpperCase());
  const discount = valid ? subtotal * 0.1 : 0;
  return { valid, discount, total: subtotal - discount };
}
