const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiError {
  detail: string | { msg: string }[];
}

class ApiClient {
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
      credentials: 'include', // Always send cookies
      headers: {
        ...this.getHeaders(),
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

  // -----------------------------------------------------------------------
  // Auth endpoints
  // -----------------------------------------------------------------------

  async getMe() {
    return this.request<any>('/api/v1/auth/me');
  }

  async logout() {
    return this.request<{ ok: boolean }>('/api/v1/auth/logout', { method: 'POST' });
  }

  async getGmailStatus() {
    return this.request<{ gmail_connected: boolean; email: string }>('/api/v1/auth/gmail/status');
  }

  // -----------------------------------------------------------------------
  // Gmail: Send
  // -----------------------------------------------------------------------

  async sendEmail(data: { to: string; subject: string; body_html: string; body_text?: string }) {
    return this.request<{ ok: boolean; gmail_message_id: string; thread_id: string }>(
      '/api/v1/emails/send',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  // -----------------------------------------------------------------------
  // Gmail: Read messages
  // -----------------------------------------------------------------------

  async listGmailMessages(params?: { max_results?: number; query?: string; page_token?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.max_results) searchParams.set('max_results', String(params.max_results));
    if (params?.query) searchParams.set('query', params.query);
    if (params?.page_token) searchParams.set('page_token', params.page_token);
    const qs = searchParams.toString();
    return this.request<any>(`/api/v1/emails/gmail/messages${qs ? `?${qs}` : ''}`);
  }

  async getGmailMessage(messageId: string, format: string = 'metadata') {
    return this.request<any>(`/api/v1/emails/gmail/messages/${messageId}?format=${format}`);
  }

  // -----------------------------------------------------------------------
  // Gmail: Drafts
  // -----------------------------------------------------------------------

  async createDraft(data: { to: string; subject: string; body_html: string; body_text?: string }) {
    return this.request<any>('/api/v1/emails/gmail/drafts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listDrafts(params?: { max_results?: number; page_token?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.max_results) searchParams.set('max_results', String(params.max_results));
    if (params?.page_token) searchParams.set('page_token', params.page_token);
    const qs = searchParams.toString();
    return this.request<any>(`/api/v1/emails/gmail/drafts${qs ? `?${qs}` : ''}`);
  }

  async getDraft(draftId: string) {
    return this.request<any>(`/api/v1/emails/gmail/drafts/${draftId}`);
  }

  async updateDraft(draftId: string, data: { to: string; subject: string; body_html: string; body_text?: string }) {
    return this.request<any>(`/api/v1/emails/gmail/drafts/${draftId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDraft(draftId: string) {
    return this.request<{ ok: boolean }>(`/api/v1/emails/gmail/drafts/${draftId}`, {
      method: 'DELETE',
    });
  }

  async sendDraft(draftId: string) {
    return this.request<any>(`/api/v1/emails/gmail/drafts/${draftId}/send`, {
      method: 'POST',
    });
  }

  async checkGmailConnection() {
    return this.request<any>('/api/v1/emails/gmail/connection');
  }

  // -----------------------------------------------------------------------
  // Email records (local DB tracking)
  // -----------------------------------------------------------------------

  async listEmailRecords(skip: number = 0, limit: number = 100) {
    return this.request<any[]>(`/api/v1/emails/?skip=${skip}&limit=${limit}`);
  }

  async getEmailRecord(emailId: number) {
    return this.request<any>(`/api/v1/emails/${emailId}`);
  }
}

export const api = new ApiClient(API_BASE_URL);
