const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { initIO } = require("./socket");
const { initScheduledJobs } = require("./utils/scheduledJobs");

// Connect to MongoDB
connectDB();

// Initialize scheduled cron jobs
initScheduledJobs();

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io
initIO(server);

// Start listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
