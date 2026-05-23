import axios from 'axios';
import socket from "../socket"; // eslint-disable-line no-unused-vars

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
export const register = async (name, email, password) => {
  const response = await api.post('/auth/register', {
    username: name,  // ← send as username to match Asmaa's API
    email,
    password
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
  
  socket.io.opts.auth = { token };
  socket.connect();

  return response.data;
};