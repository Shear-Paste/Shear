import config from '@/config.json';

const API_BASE_URL = config.API_BASE_URL;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If JSON parsing fails, use the status text
        errorMessage = res.statusText;
      }
      throw new ApiError(res.status, errorMessage);
    }

    // Handle cases where the response might not be JSON (though our backend sends JSON)
    // or if we expect specific return types.
    // Based on backend, almost all responses are JSON.
    const data = await res.json();
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network errors or other unexpected errors
    console.error('API Call Error:', error);
    throw new Error(error instanceof Error ? error.message : 'Network error or server unreachable');
  }
}
