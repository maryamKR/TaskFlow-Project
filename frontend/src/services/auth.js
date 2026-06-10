import axios from 'axios';
import socket from "../socket";

const API_URL = process.env.REACT_APP_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Response interceptor — handle expired/invalid token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/register') &&
      !originalRequest.url.includes('/auth/me')
    ) {
      socket.disconnect();
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
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
  return response.data;
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (err) {
    console.error('Logout failed', err);
  } finally {
    socket.disconnect();
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};