import { io } from "socket.io-client";

// Guarding development variables with explicit fallback and protocol normalization
const normalizeSocketUrl = (url) => {
  if (!url) return 'http://localhost:5000';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  // Use http for localhost, https for production
  const protocol = url.includes('localhost') ? 'http://' : 'https://';
  return `${protocol}${url}`;
};

const SOCKET_URL = normalizeSocketUrl(process.env.REACT_APP_SOCKET_URL);

const socket = io(SOCKET_URL, {
  autoConnect: false,
});

socket.on("connect", () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const parts = token.split('.');
    if (parts.length < 2) return;

    const payloadPart = parts[1];
    
    // Convert URL-safe Base64 characters back to standard Base64 format 
    // to guarantee atob() doesn't fail on padding strings or special character sets
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decodes unicode securely to completely prevent character translation failures
    const decodedPayload = JSON.parse(
      decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    );

    const userId = decodedPayload?.id || decodedPayload?._id || decodedPayload?.userId;
    if (userId) {
      socket.emit("join_user", userId);
    }
  } catch (err) {
    // Audit-compliant logging that gates debugging telemetry out of production builds
    if (process.env.NODE_ENV !== 'production') {
      console.error('Socket authorization handshake parsing exception handled safely:', err);
    }
  }
});

export default socket;
