import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  autoConnect: false,
});

socket.on("connect", () => {
  const token = localStorage.getItem('token');
  if (token) {
    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    const userId = tokenPayload?.id || tokenPayload?._id || tokenPayload?.userId;
    if (userId) {
      socket.emit("join_user", userId);
    }
  }
});

export default socket;