import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const socket = io(SOCKET_URL, {
  autoConnect: false,
});

socket.on("connect", () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const userId = tokenPayload?.id || tokenPayload?._id || tokenPayload?.userId;
      if (userId) {
        socket.emit("join_user", userId);
      }
    }
  } catch (err) {
    console.error('Socket auth error:', err);
  }
});

export default socket;