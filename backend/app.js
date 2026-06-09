const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const boardRoutes = require("./routes/boardRoutes");
const columnRoutes = require("./routes/columnRoutes");
const taskRoutes = require("./routes/taskRoutes");
const commentRoutes = require("./routes/commentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const aiRoutes = require("./routes/aiRoutes");

const errorHandler = require("./middleware/errorHandler");

const app = express();

// Trust the first proxy (e.g. Railway, Heroku, Nginx)
// Required for accurate IP-based rate limiting and secure cookie headers
app.set('trust proxy', 1);

// Parse allowed origins from env (comma-separated) with dev defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Secure backend HTTP headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Allow connections to self and any allowed origins
        "connect-src": ["'self'", ...allowedOrigins],
      },
    },
  }),
);

// Strict CORS Configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    maxAge: 86400, 
  }),
);

// Body parser middleware
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

module.exports = app;
