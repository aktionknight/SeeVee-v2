const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class IntegrationsApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = 'An unexpected error occurred';
      try {
        const error = await response.json();
        if (typeof error.detail === 'string') {
          errorMessage = error.detail;
        } else if (Array.isArray(error.detail)) {
          errorMessage = error.detail.map((e: any) => e.msg).join('. ');
        }
      } catch {
        errorMessage = `Request failed with status ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async saveApifyToken(apiKey: string) {
    return this.request<any>('/api/v1/integrations/apify', {
      method: 'POST',
      body: JSON.stringify({ platform: 'apify', api_key: apiKey }),
    });
  }

  async getIntegrationStatus() {
    return this.request<any[]>('/api/v1/integrations/status', {
      method: 'GET',
    });
  }

  async deleteApifyIntegration() {
    return this.request<{ ok: boolean }>('/api/v1/integrations/apify', {
      method: 'DELETE',
    });
  }

  async verifyApifyToken() {
    return this.request<{ ok: boolean; message: string }>('/api/v1/integrations/apify/verify', {
      method: 'GET',
    });
  }
}

export const integrationsApi = new IntegrationsApiClient(API_BASE_URL);
