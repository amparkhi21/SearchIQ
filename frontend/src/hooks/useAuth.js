// Public entry point for auth state. The implementation lives in AuthContext so there is a single source of truth.
import { useAuthContext } from '../context/AuthContext';

export const useAuth = useAuthContext;
export default useAuthContext;
