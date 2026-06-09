import axios from 'axios';
import socket from "../socket";

const API_URL = process.env.REACT_APP_API_URL;

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

// Response interceptor — handle expired/invalid token
api.interceptors.response.use(
  (response) => response, // pass through successful responses
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear everything and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('email');
      localStorage.removeItem('userId');
      localStorage.removeItem('lastActiveBoardId');
      socket.disconnect();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const register = async (name, email, password) => {
  const response = await api.post('/auth/register', {
    username: name, email, password
  });
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  const { token, username, _id } = response.data;
  localStorage.setItem('token', token);
  socket.auth = { token };
  socket.connect();
  localStorage.setItem('username', username);
  localStorage.setItem('email', email);
  localStorage.setItem('userId', _id);
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('email');
  localStorage.removeItem('userId');
  localStorage.removeItem('lastActiveBoardId');
  socket.disconnect();
};