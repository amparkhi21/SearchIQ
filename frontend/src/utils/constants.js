export const PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on Delivery', hint: 'Pay when your order arrives' },
  { value: 'upi', label: 'UPI', hint: 'Pay with any UPI app' },
  { value: 'card', label: 'Credit / Debit card', hint: 'Visa, Mastercard, RuPay' },
];

// Mirrors backend/src/services/order.service.js (display estimate only — the order total is computed server-side).
export const SHIPPING_THRESHOLD = 999;
export const SHIPPING_FEE = 49;

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best match' },
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'discount', label: 'Biggest discount' },
  { value: 'newest', label: 'Newest' },
];

export const ORDER_STATUS = {
  placed: { label: 'Placed', tone: 'info' },
  confirmed: { label: 'Confirmed', tone: 'brand' },
  shipped: { label: 'Shipped', tone: 'warn' },
  'out-for-delivery': { label: 'Out for delivery', tone: 'warn' },
  delivered: { label: 'Delivered', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};
export const ORDER_FLOW = ['placed', 'confirmed', 'shipped', 'out-for-delivery', 'delivered'];
export const CANCELLABLE = ['placed', 'confirmed'];
// Mirrors backend admin-order.service.js TRANSITIONS
export const NEXT_STATUS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['out-for-delivery'],
  'out-for-delivery': ['delivered'],
  delivered: [],
  cancelled: [],
};

export const SUGGESTED_SEARCHES = [
  'comfortable black shoes for college under 2500',
  'wireless earbuds with good bass',
  'cotton kurta for men',
  'non-stick cookware set',
  'lightweight backpack for travel',
];
