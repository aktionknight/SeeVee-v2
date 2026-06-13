const API_BASE = '';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'API request failed');
    }
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// Dashboard
const api = {
  dashboard: {
    stats: () => apiRequest('/api/dashboard/stats'),
    activity: (limit = 20) => apiRequest(`/api/dashboard/activity?limit=${limit}`),
  },

  leads: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams(filters).toString();
      return apiRequest(`/api/leads${params ? '?' + params : ''}`);
    },
    getById: (id) => apiRequest(`/api/leads/${id}`),
    create: (data) => apiRequest('/api/leads', { method: 'POST', body: data }),
    update: (id, data) => apiRequest(`/api/leads/${id}`, { method: 'PUT', body: data }),
    delete: (id) => apiRequest(`/api/leads/${id}`, { method: 'DELETE' }),
    clearAll: () => apiRequest(`/api/leads/all/clear`, { method: 'DELETE' }),
    enrich: () => apiRequest('/api/leads/enrich', { method: 'POST', body: {} }),
    simulate: () => apiRequest('/api/leads/simulate', { method: 'POST', body: {} }),
    importCSV: () => apiRequest('/api/leads/import', { method: 'POST', body: {} }),
    importCSVFile: async (file) => {
      const formData = new FormData();
      formData.append('csv', file);
      const response = await fetch('/api/leads/import', { method: 'POST', body: formData });
      return response.json();
    },
  },

  outreach: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams(filters).toString();
      return apiRequest(`/api/outreach${params ? '?' + params : ''}`);
    },
    send: (leadId, data = {}) => apiRequest(`/api/outreach/send/${leadId}`, { method: 'POST', body: data }),
    sendBatch: (count = 5) => apiRequest('/api/outreach/batch', { method: 'POST', body: { count } }),
    updateStatus: (id, status) => apiRequest(`/api/outreach/${id}/status`, { method: 'PUT', body: { status } }),
    updateNotes: (id, notes) => apiRequest(`/api/outreach/${id}/notes`, { method: 'PUT', body: { notes } }),
  },

  linkedin: {
    generate: (leadId, template = 'connectionRequest') =>
      apiRequest(`/api/outreach/linkedin/generate/${leadId}`, { method: 'POST', body: { template } }),
    markSent: (leadId, template, message) =>
      apiRequest(`/api/outreach/linkedin/${leadId}/sent`, { method: 'PUT', body: { template, message } }),
    getTemplates: () => apiRequest('/api/outreach/linkedin/templates'),
  },

  settings: {
    get: () => apiRequest('/api/settings'),
    update: (data) => apiRequest('/api/settings', { method: 'PUT', body: data }),
  },

  scraper: {
    start: (data) => apiRequest('/api/scraper/start', { method: 'POST', body: data }),
    status: (jobId) => apiRequest(`/api/scraper/status/${jobId}`),
  },
};

window.api = api;
