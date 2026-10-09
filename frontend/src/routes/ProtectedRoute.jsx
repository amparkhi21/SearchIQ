import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/ui/Loader';

export default function ProtectedRoute({ children }) {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();
  if (loading) return <Loader label="Checking your session…" className="min-h-[50vh]" />;
  return isAuthenticated ? children : <Navigate to="/login" replace state={{ from: location }} />;
}
