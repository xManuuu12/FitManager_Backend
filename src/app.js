const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const membresiaRoutes = require('./routes/membresiaRoutes');
const visitRoutes = require('./routes/visitRoutes');
const errorHandler = require('./middlewares/errorHandler');
const { protect } = require('./middlewares/authMiddleware');
const paymentController = require('./controllers/paymentController');

const app = express();

// 1. Configuración de CORS dinámica
app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como Postman o el propio servidor)
    if (!origin) return callback(null, true);

    const allowedDomains = [
      'localhost',
      'vercel.app', // Esto permite CUALQUIER despliegue de Vercel
      'laguna-fitnes'
    ];

    // Comprobamos si el origen contiene alguno de nuestros dominios permitidos
    const isAllowed = allowedDomains.some(domain => origin.includes(domain));

    if (isAllowed || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      // Log para saber qué origen exacto está siendo bloqueado
      console.error(`CORS Bloqueado para: ${origin}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'set-cookie']
}));

// Webhook de Stripe (Debe ir antes de express.json())
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

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
app.use('/api/visitas', protect, visitRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to FitManager SaaS API' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;