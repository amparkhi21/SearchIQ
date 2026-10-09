import { bearer, errorResponse, jsonResponse, queryParam, ref, successEnvelope } from './helpers.js';

const productRef = { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, slug: { type: 'string' }, finalPrice: { type: 'number' }, images: { type: 'array', items: { type: 'object' } } } };
const cartRef = { type: 'object', properties: { id: { type: 'string' }, user: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { product: { ...productRef }, quantity: { type: 'integer' } } } } } };
const orderRef = { type: 'object', properties: { id: { type: 'string' }, orderNumber: { type: 'string' }, status: { type: 'string' }, paymentMethod: { type: 'string' }, paymentStatus: { type: 'string' }, subtotal: { type: 'number' }, shippingFee: { type: 'number' }, total: { type: 'number' }, items: { type: 'array', items: { type: 'object' } }, shippingAddress: { type: 'object' } } };
const reviewRef = { type: 'object', properties: { id: { type: 'string' }, rating: { type: 'integer' }, title: { type: 'string' }, body: { type: 'string' }, isVerifiedPurchase: { type: 'boolean' }, user: { type: 'object' } } };
const notificationRef = { type: 'object', properties: { id: { type: 'string' }, type: { type: 'string' }, title: { type: 'string' }, message: { type: 'string' }, isRead: { type: 'boolean' }, createdAt: { type: 'string', format: 'date-time' } } };

const productPathParam = (name, description = 'Product ID') => ({ name, in: 'path', required: true, schema: { type: 'string' }, description });

export const commerceSchemas = { Cart: cartRef, Order: orderRef, Review: reviewRef, Notification: notificationRef };

export const commercePaths = {
  '/cart': {
    get: { tags: ['Cart'], summary: 'Get current cart', security: bearer, responses: { 200: jsonResponse('Cart', successEnvelope({ type: 'object', properties: { cart: { $ref: '#/components/schemas/Cart' } } }, 'Cart fetched')), 401: errorResponse('Authentication required') } },
    delete: { tags: ['Cart'], summary: 'Clear cart', security: bearer, responses: { 200: jsonResponse('Cart cleared', successEnvelope({ type: 'object', properties: { cart: { $ref: '#/components/schemas/Cart' } } }, 'Cart cleared')), 401: errorResponse('Authentication required') } },
  },
  '/cart/items/{productId}': {
    post: { tags: ['Cart'], summary: 'Add product to cart', security: bearer, parameters: [productPathParam('productId')], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['quantity'], properties: { quantity: { type: 'integer', minimum: 1, maximum: 99 } } } } } }, responses: { 200: jsonResponse('Cart updated', successEnvelope({ type: 'object', properties: { cart: { $ref: '#/components/schemas/Cart' } } }, 'Product added to cart')), 400: errorResponse('Invalid quantity/stock'), 401: errorResponse('Authentication required'), 404: errorResponse('Product not found') } },
    put: { tags: ['Cart'], summary: 'Update cart item quantity', security: bearer, parameters: [productPathParam('productId')], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['quantity'], properties: { quantity: { type: 'integer', minimum: 1, maximum: 99 } } } } } }, responses: { 200: jsonResponse('Cart updated', successEnvelope({ type: 'object', properties: { cart: { $ref: '#/components/schemas/Cart' } } }, 'Cart updated')), 400: errorResponse('Invalid quantity/stock'), 401: errorResponse('Authentication required'), 404: errorResponse('Cart/product not found') } },
    delete: { tags: ['Cart'], summary: 'Remove product from cart', security: bearer, parameters: [productPathParam('productId')], responses: { 200: jsonResponse('Cart updated', successEnvelope({ type: 'object', properties: { cart: { $ref: '#/components/schemas/Cart' } } }, 'Product removed from cart')), 401: errorResponse('Authentication required'), 404: errorResponse('Product not in cart') } },
  },
  '/wishlist': {
    get: { tags: ['Wishlist'], summary: 'Get wishlist', security: bearer, responses: { 200: jsonResponse('Wishlist', successEnvelope({ type: 'object', properties: { wishlist: { type: 'object' } } }, 'Wishlist fetched')), 401: errorResponse('Authentication required') } },
  },
  '/wishlist/{productId}': {
    post: { tags: ['Wishlist'], summary: 'Add product to wishlist', security: bearer, parameters: [productPathParam('productId')], responses: { 200: jsonResponse('Wishlist', successEnvelope({ type: 'object', properties: { wishlist: { type: 'object' } } }, 'Product added to wishlist')), 401: errorResponse('Authentication required'), 404: errorResponse('Product not found') } },
    delete: { tags: ['Wishlist'], summary: 'Remove product from wishlist', security: bearer, parameters: [productPathParam('productId')], responses: { 200: jsonResponse('Wishlist', successEnvelope({ type: 'object', properties: { wishlist: { type: 'object' } } }, 'Product removed from wishlist')), 401: errorResponse('Authentication required'), 404: errorResponse('Product not in wishlist') } },
  },
  '/orders': {
    get: { tags: ['Orders'], summary: 'List current user orders', security: bearer, parameters: [queryParam('page', { type: 'integer', minimum: 1 }), queryParam('limit', { type: 'integer', minimum: 1, maximum: 100 }), queryParam('status', { type: 'string' })], responses: { 200: jsonResponse('Orders', successEnvelope({ type: 'object', properties: { orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } }, 'Orders fetched')), 401: errorResponse('Authentication required') } },
    post: { tags: ['Orders'], summary: 'Place an order from current cart', security: bearer, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { addressId: { type: 'string' }, paymentMethod: { type: 'string', enum: ['cod', 'upi', 'card'], default: 'cod' } } } } } }, responses: { 201: jsonResponse('Order placed', successEnvelope({ type: 'object', properties: { order: { $ref: '#/components/schemas/Order' } } }, 'Order placed')), 400: errorResponse('Cart/address/stock validation failed'), 401: errorResponse('Authentication required') } },
  },
  '/orders/{orderId}': {
    get: { tags: ['Orders'], summary: 'Get one of the current user orders', security: bearer, parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: jsonResponse('Order', successEnvelope({ type: 'object', properties: { order: { $ref: '#/components/schemas/Order' } } }, 'Order fetched')), 401: errorResponse('Authentication required'), 404: errorResponse('Order not found') } },
  },
  '/orders/{orderId}/cancel': {
    post: { tags: ['Orders'], summary: 'Cancel a placed or confirmed order', security: bearer, parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: jsonResponse('Order cancelled', successEnvelope({ type: 'object', properties: { order: { $ref: '#/components/schemas/Order' } } }, 'Order cancelled')), 400: errorResponse('Order cannot be cancelled'), 401: errorResponse('Authentication required'), 404: errorResponse('Order not found') } },
  },
  '/reviews/product/{productId}': {
    get: { tags: ['Reviews'], summary: 'List product reviews', parameters: [productPathParam('productId'), queryParam('page', { type: 'integer', minimum: 1 }), queryParam('limit', { type: 'integer', minimum: 1, maximum: 50 })], responses: { 200: jsonResponse('Reviews', successEnvelope({ type: 'object', properties: { reviews: { type: 'array', items: { $ref: '#/components/schemas/Review' } } } }, 'Reviews fetched')), 404: errorResponse('Product not found') } },
    post: { tags: ['Reviews'], summary: 'Create a verified-purchase review', security: bearer, parameters: [productPathParam('productId')], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['rating', 'body'], properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, title: { type: 'string' }, body: { type: 'string' } } } } } }, responses: { 201: jsonResponse('Review created', successEnvelope({ type: 'object', properties: { review: { $ref: '#/components/schemas/Review' } } }, 'Review created')), 401: errorResponse('Authentication required'), 403: errorResponse('Delivered purchase required'), 409: errorResponse('Already reviewed') } },
  },
  '/reviews/{reviewId}': {
    put: { tags: ['Reviews'], summary: 'Update your review', security: bearer, parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: jsonResponse('Review updated', successEnvelope({ type: 'object', properties: { review: { $ref: '#/components/schemas/Review' } } }, 'Review updated')), 401: errorResponse('Authentication required'), 404: errorResponse('Review not found') } },
    delete: { tags: ['Reviews'], summary: 'Delete your review', security: bearer, parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: jsonResponse('Review deleted', successEnvelope({ type: 'object' }, 'Review deleted')), 401: errorResponse('Authentication required'), 404: errorResponse('Review not found') } },
  },
  '/notifications': {
    get: { tags: ['Notifications'], summary: 'List current user notifications', security: bearer, parameters: [queryParam('page', { type: 'integer', minimum: 1 }), queryParam('limit', { type: 'integer', minimum: 1, maximum: 50 }), queryParam('unreadOnly', { type: 'boolean' })], responses: { 200: jsonResponse('Notifications', successEnvelope({ type: 'object', properties: { notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } }, unreadCount: { type: 'integer' } } }, 'Notifications fetched')), 401: errorResponse('Authentication required') } },
  },
  '/notifications/{notificationId}/read': {
    patch: { tags: ['Notifications'], summary: 'Mark a notification as read', security: bearer, parameters: [{ name: 'notificationId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: jsonResponse('Notification updated', successEnvelope({ type: 'object', properties: { notification: { $ref: '#/components/schemas/Notification' } } }, 'Notification marked as read')), 401: errorResponse('Authentication required'), 404: errorResponse('Notification not found') } },
  },
  '/notifications/read-all': {
    post: { tags: ['Notifications'], summary: 'Mark all notifications as read', security: bearer, responses: { 200: jsonResponse('Notifications updated', successEnvelope({ type: 'object', properties: { updated: { type: 'integer' } } }, 'Notifications marked as read')), 401: errorResponse('Authentication required') } },
  },
};
