/**
 * Centralized Xano API service with rate limiting and error handling
 */

const BASE_URL = 'https://xtwz-brgd-1r1u.n7c.xano.io/api:8GoBSeHO';
const AUTH_TOKEN = import.meta.env.VITE_XANO_AUTH_TOKEN;

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

interface XanoApiError extends Error {
  status?: number;
  code?: string;
}

/**
 * Make authenticated request to Xano API with rate limiting
 */
async function xanoRequest(
  endpoint: string, 
  options: RequestInit = {}
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

    if (!AUTH_TOKEN) {
      throw new Error('Xano auth token not found. Please check your environment variables.');
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: XanoApiError = new Error(`Xano API Error: ${response.status} ${response.statusText}`);
      error.status = response.status;
      
      if (response.status === 429) {
        error.code = 'RATE_LIMITED';
        error.message = 'Too many requests. Please wait before trying again.';
      } else if (response.status === 401) {
        error.code = 'UNAUTHORIZED';
        error.message = 'Invalid authentication token.';
      }
      
      throw error;
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
    return xanoRequest('/transaction_documents', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let browser set it with boundary
      }
    });
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
  }
};

export { XanoApiError };
