const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = {
  async request(method, endpoint, data = null, isFormData = false) {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const config = { method, headers, body: data ? (isFormData ? data : JSON.stringify(data)) : undefined };
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    if (res.status === 401) { localStorage.clear(); window.location.href = '/login'; return; }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'Request failed');
    }
    return res.json();
  },
  get: (ep) => api.request('GET', ep),
  post: (ep, data) => api.request('POST', ep, data),
  patch: (ep, data) => api.request('PATCH', ep, data),
  postForm: (ep, formData) => api.request('POST', ep, formData, true),
};
export default api;
