import axios from 'axios';
import socket from "../socket"; // eslint-disable-line no-unused-vars
const API_URL = 'http://localhost:5000/api';

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

export const register = async (name, email, password) => {
  const response = await api.post('/auth/register', {
    username: name, email, password
  });
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  const { token, username } = response.data;
  localStorage.setItem('token', token);
  socket.auth = { token };
  socket.connect();
  localStorage.setItem('username', username);
  localStorage.setItem('email', email);
  return response.data;
};


export const logout = () => {
  localStorage.removeItem('token');
  socket.disconnect();
};


