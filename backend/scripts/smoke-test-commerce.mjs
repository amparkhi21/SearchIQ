import { env } from '../src/config/env.js';

const baseUrl = `http://localhost:${env.port}/api/v1`;
let passed = 0;
let failed = 0;

function pass(message) { passed += 1; console.log(`  PASS  ${message}`); }
function fail(message, error) { failed += 1; console.log(`  FAIL  ${message}${error ? `: ${error.message}` : ''}`); }

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { accept: 'application/json', ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function login(email, password) {
  const { response, body } = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 200 || !body?.data?.accessToken) throw new Error(`Login failed with ${response.status}`);
  return body.data.accessToken;
}

async function main() {
  console.log(`Testing shopping core at ${baseUrl}`);
  console.log('');

  try {
    const { response } = await request('/health');
    if (!response.ok) throw new Error(`Health returned ${response.status}`);
    pass('API is healthy');
  } catch (error) {
    fail('API is healthy', error);
    process.exitCode = 1;
    return;
  }

  let productId;
  let productName;
  try {
    const { response, body } = await request('/products?inStock=true&limit=2');
    const products = body?.data?.products ?? [];
    if (response.status !== 200 || products.length < 1) throw new Error(`Expected a seeded product, got ${response.status}`);
    productId = products[0].id;
    productName = products[0].name;
    pass('seeded catalog provides an in-stock product');
  } catch (error) { fail('seeded catalog provides an in-stock product', error); }

  const email = `searchiq-commerce-${Date.now()}@example.com`;
  const password = 'Commerce@123';
  let userToken;
  try {
    const { response, body } = await request('/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Commerce Test User', email, password }),
    });
    if (response.status !== 201 || !body?.data?.accessToken) throw new Error(`Registration failed with ${response.status}`);
    userToken = body.data.accessToken;
    pass('test user can register');
  } catch (error) { fail('test user can register', error); }

  if (!userToken || !productId) {
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exitCode = 1;
    return;
  }

  const userHeaders = { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' };
  let orderId;
  let reviewId;
  let notificationId;

  try {
    const { response, body } = await request('/users/addresses', {
      method: 'POST', headers: userHeaders,
      body: JSON.stringify({ fullName: 'Commerce Test User', phone: '+919876543210', line1: '101 Test Street', city: 'Ahmedabad', state: 'Gujarat', postalCode: '380001', country: 'India', isDefault: true }),
    });
    if (response.status !== 201 || !(body?.data?.addresses ?? []).length) throw new Error(`Address failed with ${response.status}`);
    pass('user can add a shipping address');
  } catch (error) { fail('user can add a shipping address', error); }

  try {
    const { response, body } = await request('/cart', { headers: userHeaders });
    if (response.status !== 200 || !Array.isArray(body?.data?.cart?.items)) throw new Error('Cart not returned');
    pass('new user gets an empty cart');
  } catch (error) { fail('new user gets an empty cart', error); }

  try {
    const { response, body } = await request(`/cart/items/${productId}`, {
      method: 'POST', headers: userHeaders, body: JSON.stringify({ quantity: 1 }),
    });
    if (response.status !== 200 || !(body?.data?.cart?.items ?? []).length) throw new Error(`Add-to-cart failed with ${response.status}`);
    pass('product can be added to cart');
  } catch (error) { fail('product can be added to cart', error); }

  try {
    const { response, body } = await request('/cart', { headers: userHeaders });
    const item = body?.data?.cart?.items?.find((entry) => entry.product?.id === productId);
    if (response.status !== 200 || !item || item.quantity !== 1) throw new Error('Cart item not found');
    pass('cart returns the added product and quantity');
  } catch (error) { fail('cart returns the added product and quantity', error); }

  try {
    const { response, body } = await request(`/cart/items/${productId}`, {
      method: 'PUT', headers: userHeaders, body: JSON.stringify({ quantity: 2 }),
    });
    const item = body?.data?.cart?.items?.find((entry) => entry.product?.id === productId);
    if (response.status !== 200 || item?.quantity !== 2) throw new Error(`Quantity update failed with ${response.status}`);
    pass('cart quantity can be updated');
  } catch (error) { fail('cart quantity can be updated', error); }

  try {
    const { response, body } = await request(`/wishlist/${productId}`, { method: 'POST', headers: userHeaders });
    if (response.status !== 200 || !(body?.data?.wishlist?.products ?? []).some((p) => p.id === productId)) throw new Error('Wishlist add failed');
    pass('product can be added to wishlist');
  } catch (error) { fail('product can be added to wishlist', error); }

  try {
    const { response, body } = await request('/wishlist', { headers: userHeaders });
    if (response.status !== 200 || !(body?.data?.wishlist?.products ?? []).some((p) => p.id === productId)) throw new Error('Wishlist item not returned');
    pass('wishlist lists saved products');
  } catch (error) { fail('wishlist lists saved products', error); }

  try {
    const { response, body } = await request('/orders', {
      method: 'POST', headers: userHeaders, body: JSON.stringify({ paymentMethod: 'cod' }),
    });
    if (response.status !== 201 || !body?.data?.order?.id) throw new Error(`Order placement failed with ${response.status}`);
    orderId = body.data.order.id;
    pass('checkout creates an order from the cart');
  } catch (error) { fail('checkout creates an order from the cart', error); }

  try {
    const { response, body } = await request('/cart', { headers: userHeaders });
    if (response.status !== 200 || (body?.data?.cart?.items ?? []).length !== 0) throw new Error('Cart was not cleared after checkout');
    pass('cart is cleared after successful checkout');
  } catch (error) { fail('cart is cleared after successful checkout', error); }

  try {
    const { response, body } = await request('/orders', { headers: userHeaders });
    if (response.status !== 200 || !(body?.data?.orders ?? []).some((o) => o.id === orderId)) throw new Error('Placed order missing from history');
    pass('user can view order history');
  } catch (error) { fail('user can view order history', error); }

  let adminToken;
  try {
    adminToken = await login(process.env.ADMIN_EMAIL || 'admin@searchiq.com', process.env.ADMIN_PASSWORD || 'Admin@12345');
    pass('admin can log in for order management');
  } catch (error) { fail('admin can log in for order management', error); }

  const adminHeaders = { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' };
  const transitions = ['confirmed', 'shipped', 'out-for-delivery', 'delivered'];
  if (adminToken && orderId) {
    for (const status of transitions) {
      try {
        const { response, body } = await request(`/admin/orders/${orderId}/status`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status }) });
        if (response.status !== 200 || body?.data?.order?.status !== status) throw new Error(`Expected ${status}, got ${response.status}`);
        pass(`admin can transition order to ${status}`);
      } catch (error) { fail(`admin can transition order to ${status}`, error); }
    }
  }

  if (productId && orderId) {
    try {
      const { response, body } = await request(`/reviews/product/${productId}`);
      if (response.status !== 200 || !Array.isArray(body?.data?.reviews)) throw new Error('Reviews list failed');
      pass('product reviews can be listed publicly');
    } catch (error) { fail('product reviews can be listed publicly', error); }

    try {
      const { response, body } = await request(`/reviews/product/${productId}`, {
        method: 'POST', headers: userHeaders, body: JSON.stringify({ rating: 5, title: 'Great', body: `Verified purchase of ${productName}` }),
      });
      if (response.status !== 201 || !body?.data?.review?.id) throw new Error(`Review create failed with ${response.status}`);
      reviewId = body.data.review.id;
      pass('verified purchaser can create a review after delivery');
    } catch (error) { fail('verified purchaser can create a review after delivery', error); }
  }

  try {
    const { response, body } = await request('/notifications', { headers: userHeaders });
    const notifications = body?.data?.notifications ?? [];
    notificationId = notifications[0]?.id;
    if (response.status !== 200 || !Array.isArray(notifications) || notifications.length < 1) throw new Error('Expected at least one notification');
    pass('order events create user notifications');
  } catch (error) { fail('order events create user notifications', error); }

  if (notificationId) {
    try {
      const { response, body } = await request(`/notifications/${notificationId}/read`, { method: 'PATCH', headers: userHeaders });
      if (response.status !== 200 || body?.data?.notification?.isRead !== true) throw new Error('Read state not updated');
      pass('notification can be marked as read');
    } catch (error) { fail('notification can be marked as read', error); }
  }

  if (reviewId) {
    try {
      const { response, body } = await request(`/reviews/${reviewId}`, { method: 'PUT', headers: userHeaders, body: JSON.stringify({ rating: 4, title: 'Updated', body: 'Updated verified review body' }) });
      if (response.status !== 200 || body?.data?.review?.rating !== 4) throw new Error(`Review update failed with ${response.status}`);
      pass('user can update their review');
    } catch (error) { fail('user can update their review', error); }
  }

  if (reviewId) {
    try {
      const { response } = await request(`/reviews/${reviewId}`, { method: 'DELETE', headers: userHeaders });
      if (response.status !== 200) throw new Error(`Review delete failed with ${response.status}`);
      pass('user can delete their review');
    } catch (error) { fail('user can delete their review', error); }
  }

  try {
    const { response, body } = await request(`/wishlist/${productId}`, { method: 'DELETE', headers: userHeaders });
    if (response.status !== 200 || (body?.data?.wishlist?.products ?? []).some((p) => p.id === productId)) throw new Error('Wishlist removal failed');
    pass('wishlist item can be removed');
  } catch (error) { fail('wishlist item can be removed', error); }

  try {
    const { response } = await request(`/orders/${orderId}` , { headers: userHeaders });
    if (response.status !== 200) throw new Error(`Order detail failed with ${response.status}`);
    pass('user can fetch an individual order');
  } catch (error) { fail('user can fetch an individual order', error); }

  console.log('');
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
