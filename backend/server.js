const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

// Load env
dotenv.config();

const app = express();

// Connect to MongoDB Atlas
connectDB();

//  CORS Middleware Configuration
app.use(cors({
    origin: 'http://localhost:5173', // Allows frontend port to connect
    credentials: true
}));

// Body parser middleware to read incoming JSON request bodies
app.use(express.json());

// Test Route 
app.get('/api/test', (req, res) => {
    res.json({ message: '🚀 TaskFlow Backend API is running smoothly!' });
});

// Mount Authentication Routes
app.use('/api/auth', authRoutes);

//Centralized Error Handler Middleware (Must be the last item mounted!)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(` Server listening on port ${PORT}`);
});