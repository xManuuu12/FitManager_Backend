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

// Middlewares
// Configuración de CORS más explícita
const allowedOrigins = [
  'https://laguna-fitnes-3likhdb6c-planifys-projects-8087f027.vercel.app/', // Tu frontend en Vercel
  'http://localhost:4200'                 // Tu frontend local
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (como Postman o server-to-server)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'El permiso CORS para este origen no está permitido.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Importante para las peticiones de "prueba" (Preflight)
app.options('*', cors());

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
