/**
 * Hook for authenticated API client.
 */

import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';

export const useApiClient = () => {
  const { getAuthHeaders } = useAuth();

  const authenticatedGet = async <T = unknown>(
    url: string, 
    params?: Record<string, string | number | boolean>
  ): Promise<T> => {
    const headers = getAuthHeaders();
    return apiClient.get<T>(url, params, headers);
  };

  const authenticatedPost = async <T = unknown>(
    url: string, 
    data?: unknown
  ): Promise<T> => {
    const headers = getAuthHeaders();
    return apiClient.post<T>(url, data, headers);
  };

  const authenticatedPut = async <T = unknown>(
    url: string, 
    data?: unknown
  ): Promise<T> => {
    const headers = getAuthHeaders();
    return apiClient.put<T>(url, data, headers);
  };

  const authenticatedPatch = async <T = unknown>(
    url: string, 
    data?: unknown
  ): Promise<T> => {
    const headers = getAuthHeaders();
    return apiClient.patch<T>(url, data, headers);
  };

  const authenticatedDelete = async <T = unknown>(
    url: string
  ): Promise<T> => {
    const headers = getAuthHeaders();
    return apiClient.delete<T>(url, headers);
  };

  return {
    get: authenticatedGet,
    post: authenticatedPost,
    put: authenticatedPut,
    patch: authenticatedPatch,
    delete: authenticatedDelete,
    // For non-authenticated requests
    publicGet: apiClient.get.bind(apiClient),
    publicPost: apiClient.post.bind(apiClient),
  };
};
