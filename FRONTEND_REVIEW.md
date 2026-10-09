# SearchIQ — Frontend stabilisation & redesign notes

## Frontend architecture (after this pass)
- `src/api/*` one thin module per backend area; `axios.js` owns auth header, single-flight refresh, `unwrap` / `unwrapWithMeta` / `errorMessage`.
- `src/context/*` Auth, Cart, Wishlist, Toast. `hooks/useAuth.js` re-exports AuthContext (single source of truth).
- `src/components/ui/*` design-system primitives (Icon, Rating, Price, Drawer, Modal, Pagination, skeletons…).
- `src/components/*` Header, SearchBox, ProductCard, filters, order timeline, admin kit. `src/pages/*` routes; admin pages are lazy-loaded.
- Design tokens live in `tailwind.config.js` (`ink` navy, `brand` indigo, `accent` purple) and `index.css` component classes.

## API mismatches found and fixed (frontend side only)
| Area | Problem | Fix |
|---|---|---|
| Search | `sort=relevance` is not a valid enum value on `/search/query` → 400 | never sent; omitted for relevance |
| Orders | `listOrders` returned the raw body, page read `d.orders` → always empty | `unwrapWithMeta` returns `{orders, meta}` |
| Analytics | read `d.totalSearches`, `x.count`; real shape is `summary.totalSearches`, `topQueries[].searches`, rate is 0–1 | rewritten against real payload |
| Wishlist | add endpoint is idempotent (never 409) so hearts could not un-save | `WishlistContext` tracks saved ids, toggles add/remove |
| Cart | cards called the API directly, header badge went stale | all mutations go through `CartContext` |
| Auth | logout never removed the access token → session came back after reload | `persist()` clears token + user |
| Password | backend revokes all sessions on change | UI signs out and redirects to login |
| Admin orders | UI allowed any status; backend enforces a transition table | UI offers only valid next states |
| Pagination meta | catalog/orders/notifications/reviews meta was dropped | all list calls return `meta` |

## Not changed (by design)
Backend, ai-service and docker-compose are byte-identical to the uploaded project.
