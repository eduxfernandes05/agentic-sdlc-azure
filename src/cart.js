// Contoso Cart — core pricing logic.

/**
 * Calculate the total price for a list of items.
 * Each item is { name, price, quantity }.
 */
export function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function freeShipping(subtotal) {
  return subtotal > 50;
}

// NOTE: discount codes are not supported yet. See issue #1.
