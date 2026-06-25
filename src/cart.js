// Contoso Cart — core pricing logic.

/**
 * Calculate the total price for a list of items.
 * Each item is { name, price, quantity }.
 */
export function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

const DISCOUNT_CODES = {
  CONTOSO10: 10,
};

/**
 * Apply a discount code to a total.
 * Supported codes: CONTOSO10 (10% off).
 * Any other or missing code returns the original total unchanged.
 */
export function applyDiscount(total, code) {
  const discountPercent = DISCOUNT_CODES[code];
  if (discountPercent !== undefined) {
    return total * (1 - discountPercent / 100);
  }
  return total;
}
