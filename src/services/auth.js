import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Axios instance with token auto-attached
export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Register
export const register = async (username, email, password) => {
  const response = await api.post('/auth/register', {
    username, email, password
  });
  return response.data;
};

// Login
export const login = async (email, password) => {
  const response = await api.post('/auth/login', {
    email, password
  });
  const { token } = response.data;
  localStorage.setItem('token', token);
  return response.data;
};