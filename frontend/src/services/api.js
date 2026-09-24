import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Public ----

export async function submitIncident(formData) {
  const response = await api.post('/incidents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

// ---- Auth ----

export async function loginAdmin(username, password) {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
}

// ---- Admin ----

export async function getIncidents() {
  const response = await api.get('/incidents');
  return response.data;
}

export async function getIncidentById(id) {
  const response = await api.get(`/incidents/${id}`);
  return response.data;
}

export async function updateIncidentStatus(id, status) {
  const response = await api.patch(`/incidents/${id}/status`, { status });
  return response.data;
}

export async function deleteIncident(id) {
  const response = await api.delete(`/incidents/${id}`);
  return response.data;
}

export async function healthCheck() {
  const response = await api.get('/health');
  return response.data;
}

export default api;
