import { useAuth as useAuthContext } from '../context/AuthContext';

export interface UseAuthReturn {
  user: any;
  authToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAdminAccess: () => boolean;
}

export const useAuth = (): UseAuthReturn => {
  const authContext = useAuthContext();

  // Check if user is admin based on the isAdmin field
  const isAdmin = authContext.user?.isAdmin === 'Yes';

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
  };
};
