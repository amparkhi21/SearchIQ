import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useToast } from '../context/ToastContext';

/** Returns `ensure()` → true when signed in; otherwise routes to /login (remembering where to come back to). */
export default function useRequireAuth() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  return useCallback((message = 'Please sign in to continue') => {
    if (isAuthenticated) return true;
    toast.info(message);
    navigate('/login', { state: { from: location } });
    return false;
  }, [isAuthenticated, navigate, location, toast]);
}
