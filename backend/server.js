const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const boardRoutes = require("./routes/boardRoutes");
const columnRoutes = require("./routes/columnRoutes");
const taskRoutes = require("./routes/taskRoutes");
const commentRoutes = require("./routes/commentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const http = require("http");
const { initSocket } = require("./socket");

const errorHandler = require("./middleware/errorHandler");

// Load env
dotenv.config();

const app = express();

// Connect to MongoDB Atlas
connectDB();

// CORS Middleware Configuration
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
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

// Centralized Error Handler Middleware
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
