import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';

export default function NotFound() {
  return (
    <div className="page">
      <EmptyState icon="search" title="Page not found" text="The page you’re looking for doesn’t exist or has moved."
        action={<div className="flex gap-2"><Link to="/" className="btn-primary">Go home</Link><Link to="/search" className="btn-secondary">Browse products</Link></div>} />
    </div>
  );
}
