// Contoso Cart — core pricing logic.

/**
 * Calculate the total price for a list of items.
 * Each item is { name, price, quantity }.
 */
export function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Valid voucher codes mapped to their discount fraction.
 * e.g. 0.10 = 10% off.
 */
const VOUCHERS = {
  SAVE10: 0.10,
};

/**
 * Apply a voucher code to a total amount.
 * Returns an object { discountedTotal, discountAmount }.
 * Throws an Error if the voucher code is invalid or expired.
 *
 * @param {number} total - The original order total.
 * @param {string} voucherCode - The voucher code entered by the customer.
 * @returns {{ discountedTotal: number, discountAmount: number }}
 */
export function applyVoucher(total, voucherCode) {
  const code = (voucherCode || "").trim().toUpperCase();
  if (!VOUCHERS[code]) {
    throw new Error(`Invalid or expired voucher code: "${voucherCode}"`);
  }
  const discountAmount = parseFloat((total * VOUCHERS[code]).toFixed(2));
  const discountedTotal = parseFloat((total - discountAmount).toFixed(2));
  return { discountedTotal, discountAmount };
}
