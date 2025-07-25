import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin: 'Yes' | 'No';
  // Add other user properties as needed based on your Xano user structure
}

export interface AuthContextType {
  user: User | null;
  authToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setAuthToken(token);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        // Clear invalid data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }
    
    setIsLoading(false);
  }, []);

  // Helper function to fetch current user information
  const fetchCurrentUser = async (authToken: string, userEmail: string): Promise<any> => {
    try {
      // For now, we'll use a simple admin check based on known admin users
      // In the future, you can replace this with a proper API call to get user data
      const adminEmails = ['msbaxter@gmail.com']; // Add more admin emails as needed
      
      const isAdminUser = adminEmails.includes(userEmail);
      
      return {
        id: userEmail,
        Email: userEmail,
        firstName: '', // Could be populated from login response if available
        lastName: '', // Could be populated from login response if available
        isAdmin: isAdminUser ? 'Yes' : 'No',
      };
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      // Return basic user info if fetch fails
      return {
        id: userEmail,
        Email: userEmail,
        firstName: '',
        lastName: '',
        isAdmin: 'No',
      };
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('https://xtwz-brgd-1r1u.n7c.xano.io/api:8GoBSeHO/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Email: email,
          Password: password,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid email or password');
        } else if (response.status === 429) {
          throw new Error('Too many login attempts. Please try again later.');
        } else {
          throw new Error('Login failed. Please try again.');
        }
      }

      const data = await response.json();
      
      if (!data.authToken) {
        throw new Error('No authentication token received');
      }

      // Fetch user information using the auth token
      const userInfo = await fetchCurrentUser(data.authToken, email);
      
      const userData: User = {
        id: userInfo.id?.toString() || email,
        email: userInfo.Email || email,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        isAdmin: userInfo.isAdmin || 'No',
      };

      // Store token and user data
      localStorage.setItem('authToken', data.authToken);
      localStorage.setItem('userData', JSON.stringify(userData));
      
      setAuthToken(data.authToken);
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Clear state
    setAuthToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    authToken,
    isLoading,
    isAuthenticated: !!user && !!authToken,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
