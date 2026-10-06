import axios from 'axios';
import { getIdToken } from './cognito';

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

// ---- Normal user (Cognito) client ----
// Separate instance so the admin JWT is never sent on user calls (and vice versa).
const userApi = axios.create({
  baseURL: `${API_URL}/api`,
});

userApi.interceptors.request.use(async (config) => {
  const idToken = await getIdToken(); // auto-refreshes if expired
  if (idToken) {
    config.headers.Authorization = `Bearer ${idToken}`;
  }
  return config;
});

// ---- Authenticated user ----

export async function submitIncident(formData) {
  const response = await userApi.post('/incidents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getMyProfile() {
  const response = await userApi.get('/users/me');
  return response.data;
}

export async function getMyIncidents() {
  const response = await userApi.get('/users/me/incidents');
  return response.data;
}

export async function getMyIncidentById(id) {
  const response = await userApi.get(`/users/me/incidents/${encodeURIComponent(id)}`);
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
