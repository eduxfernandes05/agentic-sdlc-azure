// Contoso Cart — core pricing logic.

/**
 * Calculate the total price for a list of items.
 * Each item is { name, price, quantity }.
 */
export function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

const GIFT_WRAP_PRICE_PER_ITEM = 3.5;

/**
 * Calculate the gift wrapping fee for a given number of items.
 * @param {number} itemCount - Number of items to gift wrap.
 * @returns {number} Total gift wrapping fee.
 */
export function giftWrapFee(itemCount) {
  return itemCount * GIFT_WRAP_PRICE_PER_ITEM;
}

// NOTE: discount codes are not supported yet. See issue #1.
