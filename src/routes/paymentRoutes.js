const express = require('express');
const router = express.Router();
const {
  getAllPayments,
  getVencidosAlerts,
  createStripeIntent,
  recordPayment
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect); // All payment routes require auth

router.get('/', getAllPayments);
router.get('/alerts', getVencidosAlerts);
router.post('/', recordPayment);
router.post('/create-intent', createStripeIntent);

module.exports = router;
