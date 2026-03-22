import AsyncStorage from "@react-native-async-storage/async-storage";
const API_BASE = 'https://03f9-2409-40f2-156-c562-540c-6465-8676-89f1.ngrok-free.app/api'; // Android emulator → host machine

const api = {

  token: null,

  async init() {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      this.token = token;
      console.log("✅ Loaded token:", token);
    } else {
      console.log("❌ No token found");
    }
  },

  setToken(t) {
    this.token = t;
  },
  async request(method, endpoint, data = null, isFormData = false) {
    const headers = {};
    // 🔥 ALWAYS LOAD TOKEN FROM STORAGE
    if (!this.token) {
      const storedToken = await AsyncStorage.getItem("token");
      if (storedToken) {
        this.token = storedToken;
        console.log("🔄 Token loaded inside request");
      }
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    console.log("🔑 TOKEN USED:", this.token);
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const config = {
      method,
      headers,
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, config);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || 'Request failed');
      }
      return await res.json();
    } catch (e) {
      if (e.message === 'Network request failed') {
        throw new Error('Cannot reach server. Make sure the backend is running on port 8000.');
      }
      throw e;
    }
  },

  get: function (ep) { return this.request('GET', ep); },
  post: function (ep, data) { return this.request('POST', ep, data); },
  patch: function (ep, data) { return this.request('PATCH', ep, data); },
  postForm: function (ep, formData) { return this.request('POST', ep, formData, true); },
};

export default api;
