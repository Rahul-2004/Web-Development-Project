// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport'); // from node_modules
require('./config/passport');        // loads our passport config

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const stockRoutes = require('./routes/stockRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Debug middleware: logs every request
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Body parsers & CORS
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Session middleware (required for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set secure: true if HTTPS in production
}));

// Initialize Passport (must come after session)
app.use(passport.initialize());
app.use(passport.session());

// Mongoose debug (shows Mongo queries in console)
mongoose.set('debug', true);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Mount routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/stocks', stockRoutes);

// Test route
app.get('/', (req, res) => {
  console.log('GET / triggered');
  res.json({ message: '🚀 Server is running!' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
