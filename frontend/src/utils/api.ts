/**
 * Type-safe API client utility.
 */

import { 
  ApiError, 
  ApiRequestConfig, 
  ApiClientConfig
} from '../types/api';

class ApiClient {
  private config: ApiClientConfig;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseURL: config.baseURL || 'http://localhost:8000',
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    };
  }

  private async request<T = unknown>(config: ApiRequestConfig): Promise<T> {
    const url = new URL(config.url, this.config.baseURL);
    
    // Add query parameters
    if (config.params) {
      Object.entries(config.params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const requestInit: RequestInit = {
      method: config.method,
      headers: {
        ...this.config.headers,
        ...config.headers,
      },
    };

    // Add body for POST/PUT/PATCH requests
    if (config.data && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      requestInit.body = JSON.stringify(config.data);
    }

    try {
      const response = await fetch(url.toString(), requestInit);
      
      if (!response.ok) {
        let errorData: ApiError;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            detail: response.statusText || 'Unknown error',
            status_code: response.status,
          };
        }
        throw new ApiClientError(errorData.detail, response.status);
      }

      // Handle empty responses
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiClientError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  public async get<T = unknown>(
    url: string, 
    params?: Record<string, string | number | boolean>,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>({
      method: 'GET',
      url,
      params,
      headers,
    });
  }

  public async post<T = unknown>(
    url: string, 
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>({
      method: 'POST',
      url,
      data,
      headers,
    });
  }

  public async put<T = unknown>(
    url: string, 
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>({
      method: 'PUT',
      url,
      data,
      headers,
    });
  }

  public async patch<T = unknown>(
    url: string, 
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>({
      method: 'PATCH',
      url,
      data,
      headers,
    });
  }

  public async delete<T = unknown>(
    url: string,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>({
      method: 'DELETE',
      url,
      headers,
    });
  }
}

export class ApiClientError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
  }
}

// Create default API client instance
export const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

// Convenience functions for common API patterns
export const createResource = async <T>(endpoint: string, data: unknown): Promise<T> => {
  return apiClient.post<T>(endpoint, data);
};

export const fetchResource = async <T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> => {
  return apiClient.get<T>(endpoint, params);
};

export const updateResource = async <T>(endpoint: string, data: unknown): Promise<T> => {
  return apiClient.put<T>(endpoint, data);
};

export const deleteResource = async <T>(endpoint: string): Promise<T> => {
  return apiClient.delete<T>(endpoint);
};
