const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const errorHandler = require('./middlewares/errorHandler');
const { protect } = require('./middlewares/authMiddleware');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', protect, memberRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to FitManager API' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
