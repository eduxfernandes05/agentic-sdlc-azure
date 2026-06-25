// Contoso Cart — core pricing logic.

const VALID_VOUCHER = "SAVE50";
const VOUCHER_DISCOUNT = 0.5;

/**
 * Calculate the total price for a list of items.
 * Each item is { name, price, quantity }.
 */
export function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Validate whether the given voucher code is valid.
 * Returns true if valid, false otherwise.
 */
export function validateVoucher(code) {
  return code === VALID_VOUCHER;
}

/**
 * Apply a voucher to the given total.
 * Returns { total, error } where:
 *   - total is the final amount after discount (or the original if invalid)
 *   - error is a string message when the voucher is invalid, null otherwise
 */
export function applyVoucher(total, voucherCode) {
  if (!validateVoucher(voucherCode)) {
    return { total, error: "Invalid voucher." };
  }
  return { total: total * (1 - VOUCHER_DISCOUNT), error: null };
}
