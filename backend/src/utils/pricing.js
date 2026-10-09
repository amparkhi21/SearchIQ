/** Price the customer pays after the discount, rounded to 2 decimals. */
export function calculateFinalPrice(price, discountPercent = 0) {
  return Math.round(Number(price) * (100 - Number(discountPercent))) / 100;
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
