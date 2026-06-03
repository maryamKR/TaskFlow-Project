const dotenv = require("dotenv");
// Load env
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const boardRoutes = require("./routes/boardRoutes");
const columnRoutes = require("./routes/columnRoutes");
const taskRoutes = require("./routes/taskRoutes");
const commentRoutes = require("./routes/commentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const aiRoutes = require("./routes/aiRoutes");

const http = require("http");
//const { initSocket } = require("./socket");
const { initIO } = require("./socket");

const errorHandler = require("./middleware/errorHandler");


const { initScheduledJobs } = require("./utils/scheduledJobs");

const app = express();

// Parse allowed origins from env (comma-separated) with dev defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

// Connect to MongoDB Atlas
connectDB();

// Initialize scheduled cron jobs
initScheduledJobs();

// Secure backend HTTP headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "connect-src": ["'self'", ...allowedOrigins],
      },
    },
  }),
);

// CORS Middleware Configuration
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Body parser middleware to read incoming JSON request bodies
app.use(express.json());

// Test Route
app.get("/api/test", (req, res) => {
  res.json({ message: "TaskFlow Backend API is running smoothly!" });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/columns", columnRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiRoutes);
// Centralized Error Handler Middleware
app.use(errorHandler);

const server = http.createServer(app);
//initSocket(server);


initIO(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
