const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiError {
  detail: string | { msg: string }[];
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(includeAuth: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (includeAuth) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}, includeAuth: boolean = false): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(includeAuth),
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = 'An unexpected error occurred';
      try {
        const error: ApiError = await response.json();
        if (typeof error.detail === 'string') {
          errorMessage = error.detail;
        } else if (Array.isArray(error.detail)) {
          // Pydantic validation errors
          errorMessage = error.detail.map((e) => e.msg).join('. ');
        }
      } catch {
        errorMessage = `Request failed with status ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth endpoints
  async signup(data: { email: string; name: string; password: string }) {
    return this.request<{ access_token: string; token_type: string; user: any }>(
      '/api/v1/auth/signup',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ access_token: string; token_type: string; user: any }>(
      '/api/v1/auth/login',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async getMe() {
    return this.request<any>('/api/v1/auth/me', {}, true);
  }
}

export const api = new ApiClient(API_BASE_URL);
