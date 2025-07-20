import { useAuth as useAuthContext } from '../context/AuthContext';

export interface UseAuthReturn {
  user: any;
  authToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConvexSynced: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAdminAccess: () => boolean;
  checkAdminStatus: () => boolean;
}

export const useAuth = (): UseAuthReturn => {
  const authContext = useAuthContext();

  // Check if user is admin based on multiple fields for compatibility
  const isAdmin = authContext.user?.isAdmin === 'Yes' || 
                  authContext.user?.role === 'ADMIN' || 
                  authContext.checkAdminStatus?.() || 
                  false;

  const checkAdminAccess = (): boolean => {
    if (!authContext.isAuthenticated) {
      throw new Error('You must be logged in to perform this action.');
    }
    if (!isAdmin) {
      throw new Error('Administrator access required for this action.');
    }
    return true;
  };

  return {
    ...authContext,
    isAdmin,
    checkAdminAccess,
    checkAdminStatus: authContext.checkAdminStatus || (() => isAdmin),
  };
};
