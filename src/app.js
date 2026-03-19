const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const membresiaRoutes = require('./routes/membresiaRoutes');
const errorHandler = require('./middlewares/errorHandler');
const { protect } = require('./middlewares/authMiddleware');

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', protect, memberRoutes);
app.use('/api/payments', protect, paymentRoutes);
app.use('/api/notifications', protect, notificationRoutes);
app.use('/api/membresias', protect, membresiaRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to FitManager SaaS API' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
