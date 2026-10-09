import { Link } from 'react-router-dom';
import Logo from './ui/Logo';

export default function Footer() {
  const col = 'space-y-2.5 text-sm text-ink-300';
  const link = 'hover:text-white';
  return (
    <footer className="mt-16 bg-ink-950 text-ink-300">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-300">
            Search the way you think. SearchIQ blends keyword relevance with semantic understanding to help you find the right product faster.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Shop</h3>
          <ul className={col}>
            <li><Link className={link} to="/search">All products</Link></li>
            <li><Link className={link} to="/search?sort=popular">Popular picks</Link></li>
            <li><Link className={link} to="/search?sort=discount">Best deals</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Account</h3>
          <ul className={col}>
            <li><Link className={link} to="/profile">Profile</Link></li>
            <li><Link className={link} to="/orders">Orders</Link></li>
            <li><Link className={link} to="/wishlist">Wishlist</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Platform</h3>
          <ul className={col}>
            <li>Hybrid BM25 + vector search</li>
            <li>AI query understanding</li>
            <li>Personalised recommendations</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-400 sm:flex-row">
          <p>© {new Date().getFullYear()} SearchIQ. All rights reserved.</p>
          <p>React · Node.js · MongoDB · Redis · OpenSearch · FastAPI</p>
        </div>
      </div>
    </footer>
  );
}
