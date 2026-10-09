import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/ui/Loader';

export default function AdminRoute({ children }) {
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  if (loading) return <Loader label="Checking your session…" className="min-h-[50vh]" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return isAdmin ? children : <Navigate to="/" replace />;
}
