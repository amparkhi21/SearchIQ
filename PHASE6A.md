# SearchIQ Phase 6A – Shopping Core

This phase adds buyer-side commerce flows on top of the verified catalog/search stack:

- Cart: get, add, update quantity, remove item, clear cart
- Wishlist: list, add, remove
- Checkout: create an order from the current cart with an address snapshot and payment method
- Order history: list/get/cancel own orders
- Admin order management: list/get orders and move them through the supported status flow
- Reviews: public listing; verified-purchase create/update/delete; product rating refresh
- Notifications: list, mark one read, mark all read; order events create notifications

## Important behavior

MongoDB remains the source of truth. Product stock is decremented atomically per cart item while placing an order. Order cancellation restores stock. Search index inventory/rating facts are synced on a best-effort basis because OpenSearch contains derived data.

Supported order status flow:

`placed -> confirmed -> shipped -> out-for-delivery -> delivered`

Cancellation is allowed from `placed` or `confirmed`.

## Test

From `backend` with the Node API running:

```powershell
npm.cmd run test:commerce
```

The smoke test creates a throwaway user/order. It intentionally does not delete persistent MongoDB test data because the existing API has no generic user-delete endpoint.
