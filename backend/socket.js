const { Server } = require("socket.io");
const User = require("./models/User");

// Parse allowed origins from env (comma-separated) with dev defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

let io;

// Telemetry utility that completely gates console logging out of production
const logDebug = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};

const initIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    logDebug(`Socket connected: ${socket.id}`);

    // Isolated Personal User Rooms
    socket.on("join_user", (userId) => {
      if (!userId) return;
      
      const userRoom = `user:${userId}`; // Standardized custom prefix
      socket.join(userRoom);
      socket.data.userId = userId.toString(); // Track on socket object for disconnect logic
      logDebug(`User ${userId} registered to room: ${userRoom}`);
    });

    // Object Payload Room Joining & Presence Activation
    socket.on("join_board", async ({ boardId, userId }) => {
      if (!boardId || !userId) {
        if (process.env.NODE_ENV !== 'production') {
          console.error("Invalid join_board payload block structure");
        }
        return;
      }

      // Store userId inside internal socket state data so it's accessible during disconnect
      socket.data.userId = userId.toString();
      
      // Track which boards this connection joins BEFORE disconnection clears them
      if (!socket.data.activeBoards) {
        socket.data.activeBoards = new Set();
      }
      socket.data.activeBoards.add(boardId.toString());

      // Bind socket connection to rooms
      socket.join(boardId.toString());
      socket.join(`user:${userId}`);

      try {
        // Toggle user state to true inside MongoDB User Schema
        await User.findByIdAndUpdate(userId, { isOnline: true });
        logDebug(`DB Marker Updated: User ${userId} is ONLINE`);

        // Broadcast presence change to everyone else inside this project room
        socket.to(boardId.toString()).emit("member_online", { 
          userId: userId.toString(), 
          boardId: boardId.toString() 
        });
      } catch (err) {
        logDebug("Presence status modification error:", err.message);
      }
    });

    // Manual Leave Room Event
    socket.on("leave_board", (boardId) => {
      if (!boardId) return;
      socket.leave(boardId.toString());
      
      if (socket.data.activeBoards) {
        socket.data.activeBoards.delete(boardId.toString());
      }
      logDebug(`Socket left board room: ${boardId}`);
    });

    // Multi-Tab Buffer Disconnect Logic
    socket.on("disconnect", async () => {
      logDebug(`Socket disconnected: ${socket.id}`);
      
      const userId = socket.data.userId;
      if (!userId) return; // Connection was never registered, drop safely

      try {
        // Query if this specific user room has ANY active socket clients left open
        const remainingSockets = await io.in(`user:${userId}`).fetchSockets();
        
        // Multi-tab check: only declare them offline if they closed their LAST open browser tab!
        if (remainingSockets.length === 0) {
          await User.findByIdAndUpdate(userId, { isOnline: false });
          logDebug(`User ${userId} closed all sessions. DB Marker set to OFFLINE.`);

          // Target only the user's active board rooms to prevent global data leakage
          if (socket.data.activeBoards && socket.data.activeBoards.size > 0) {
            socket.data.activeBoards.forEach((boardRoomId) => {
              io.to(boardRoomId).emit("member_offline", { userId: userId.toString() });
            });
            logDebug(`User ${userId} offline notice routed to active board rooms safely.`);
          }
        } else {
          logDebug(`User ${userId} closed a tab, but has ${remainingSockets.length} tab(s) running.`);
        }
      } catch (err) {
        logDebug("Error setting network disconnection state flags:", err.message);
      }
    });
  });

  return io;
};

const hasIO = () => Boolean(io);

const getIO = () => {
  if (!io) throw new Error("Socket.io has not been initialized!");
  return io;
};

module.exports = { initIO, getIO, hasIO };