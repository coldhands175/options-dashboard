/**
 * Centralized Xano API service with rate limiting and error handling
 */

const BASE_URL = 'https://xtwz-brgd-1r1u.n7c.xano.io/api:8GoBSeHO';

/**
 * Get the current authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

// Rate limiting: Simple in-memory cache to prevent excessive API calls
class RateLimitedCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly REQUEST_DELAY = 1000; // 1 second between requests
  private lastRequestTime = 0;

  async get(key: string): Promise<any | null> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      await new Promise(resolve => 
        setTimeout(resolve, this.REQUEST_DELAY - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }
}

const cache = new RateLimitedCache();

export class XanoApiError extends Error {
  status?: number;
  code?: string;
  
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'XanoApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Make authenticated request to Xano API with rate limiting
 */
async function xanoRequest(
  endpoint: string, 
  options: RequestInit = {},
  requireAuth: boolean = true
): Promise<any> {
  try {
    // Check cache first
    const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      console.log('🔄 Using cached data for:', endpoint);
      return cachedData;
    }

    // Enforce rate limiting
    await cache.enforceRateLimit();

    const authToken = getAuthToken();
    if (requireAuth && !authToken) {
      throw new XanoApiError('Authentication required. Please log in.', 401, 'NO_AUTH_TOKEN');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Add authorization header if we have a token
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let message = `Xano API Error: ${response.status} ${response.statusText}`;
      let code: string | undefined;
      
      if (response.status === 429) {
        code = 'RATE_LIMITED';
        message = 'Too many requests. Please wait before trying again.';
      } else if (response.status === 401) {
        code = 'UNAUTHORIZED';
        message = 'Invalid authentication token. Please log in again.';
        // Clear invalid token
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
      
      throw new XanoApiError(message, response.status, code);
    }

    const data = await response.json();
    
    // Cache successful responses
    cache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error('Xano API request failed:', error);
    throw error;
  }
}

/**
 * API service methods
 */
export const xanoApi = {
  // Transactions
  async getTransactions() {
    return xanoRequest('/transactions');
  },

  async uploadTransactionDocuments(formData: FormData) {
    const authToken = getAuthToken();
    if (!authToken) {
      throw new XanoApiError('Authentication required. Please log in.', 401, 'NO_AUTH_TOKEN');
    }

    // For file uploads, we need to handle headers differently
    const response = await fetch(`${BASE_URL}/transaction_documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      let message = `Xano API Error: ${response.status} ${response.statusText}`;
      if (response.status === 401) {
        message = 'Invalid authentication token. Please log in again.';
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
      throw new XanoApiError(message, response.status);
    }

    return response.json();
  },

  async getTransactionDocuments() {
    return xanoRequest('/transaction_documents');
  },

  // Add other API endpoints as needed
  async createTransaction(transactionData: any) {
    return xanoRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  },

  async updateTransaction(id: string, transactionData: any) {
    return xanoRequest(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(transactionData),
    });
  },

  async deleteTransaction(id: string) {
    return xanoRequest(`/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  // User management
  async changePassword(_currentPassword: string, _newPassword: string) {
    const authToken = getAuthToken();
    if (!authToken) {
      throw new XanoApiError('Authentication required. Please log in.', 401, 'NO_AUTH_TOKEN');
    }

    // For now, we'll return a placeholder response
    // In the future, you can implement the actual API call to Xano
    // when you create the change password endpoint
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    
    // TODO: Implement actual password change API call
    // Example implementation would look like:
    // return xanoRequest('/auth/change-password', {
    //   method: 'PATCH',
    //   body: JSON.stringify({
    //     currentPassword,
    //     newPassword,
    //   }),
    // });
    
    return { success: true, message: 'Password changed successfully' };
  },

  // Password reset functionality
  async requestPasswordReset(_email: string) {
    // For now, we'll return a placeholder response
    // In the future, you can implement the actual API call to Xano
    // when you create the password reset endpoint
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
    
    // TODO: Implement actual password reset request API call
    // Example implementation would look like:
    // return xanoRequest('/auth/request-password-reset', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     email,
    //   }),
    // }, false); // false = no auth required
    
    return { success: true, message: 'Password reset email sent' };
  },

  async resetPassword(_token: string, _email: string, _newPassword: string) {
    // For now, we'll return a placeholder response
    // In the future, you can implement the actual API call to Xano
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
    
    // TODO: Implement actual password reset API call
    // Example implementation would look like:
    // return xanoRequest('/auth/reset-password', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     token,
    //     email,
    //     newPassword,
    //   }),
    // }, false); // false = no auth required
    
    return { success: true, message: 'Password reset successful' };
  }
};
