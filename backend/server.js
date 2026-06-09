const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { initIO } = require("./socket");
const { initScheduledJobs } = require("./utils/scheduledJobs");
const User = require("./models/User");

const startServer = async () => {
  try {
    // 1. Connect to MongoDB and await completion
    await connectDB();

    // 2. Production Safety Fix: Reset all users to offline on startup
    // This prevents "ghost" online users if the server crashed previously
    await User.updateMany({}, { isOnline: false });
    console.log(" Presence System: All user states reset to offline.");

    // 3. Initialize background services
    initScheduledJobs();

    // 4. Create HTTP Server
    const server = http.createServer(app);

    // 5. Initialize Socket.io
    initIO(server);

    // 6. Start listening
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
