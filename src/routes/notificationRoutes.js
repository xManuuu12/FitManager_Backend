const express = require('express');
const router = express.Router();
const { sendReminder, handleIncomingWhatsApp, verifyWebhook } = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

// Rutas públicas para Meta Webhook
router.get('/whatsapp-webhook', verifyWebhook);
router.post('/whatsapp-webhook', handleIncomingWhatsApp);

// Rutas protegidas
router.use(protect);
router.post('/send-reminder/:id', sendReminder);

module.exports = router;
