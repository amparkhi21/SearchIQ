# SearchIQ Phase 7A — Frontend Foundation

This phase adds the first complete React/Vite client on top of the verified backend.

## Stack
- React 18
- Vite 5
- React Router 6
- Axios
- Tailwind/PostCSS configuration with a custom responsive design system

## User flows
- Home and category discovery
- Unified AI search with suggestions and filters
- Product details, similar products and reviews
- Login/register
- Cart and wishlist
- Checkout with COD/UPI/Card selection
- Orders and order details
- Profile and shipping addresses
- Notifications
- Admin dashboard, products, inventory, orders and search analytics

## Run locally

```powershell
cd frontend
npm install
npm run dev
```

The frontend expects:

```text
VITE_API_URL=http://localhost:5000/api/v1
```

## Production build

```powershell
npm run build
npm run preview
```

The browser only calls the Node backend. The Python AI service remains internal.
