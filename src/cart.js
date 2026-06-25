// Contoso Cart — core pricing logic.

/**
 * Calculate the total price for a list of items.
 * Each item is { name, price, quantity }.
 */
export function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}


/** Supported voucher codes mapped to their discount rate (0–1). */
const VOUCHERS = { SAVE10: 0.1 };

/**
 * Apply a voucher code to a subtotal.
 * Returns the discounted total, or throws for an invalid code.
 * @param {number} total
 * @param {string} code
 * @returns {number}
 */
export function applyVoucher(total, code) {
  const rate = VOUCHERS[code];
  if (rate === undefined) throw new Error(`Invalid voucher code: ${code}`);
  return +(total * (1 - rate)).toFixed(2);
}

/**
 * Validate a voucher-code string (1–20 uppercase letters/digits only).
 * @param {string} code
 * @returns {boolean}
 */
export function validateVoucherCode(code) {
  return typeof code === "string" && /^[A-Z0-9]{1,20}$/.test(code);
}
