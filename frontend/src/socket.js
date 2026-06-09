import { io } from "socket.io-client";

// Guarding development variables with explicit fallback
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const socket = io(SOCKET_URL, {
  autoConnect: false,
  // Start with polling (universally supported), then upgrade to WebSocket.
  // This is required for Railway and other reverse-proxy environments that
  // can block WebSocket upgrade handshakes on the first attempt.
  transports: ['polling', 'websocket'],
  upgrade: true,
  // Reconnection settings for production resilience
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  withCredentials: true,
});


export default socket;
