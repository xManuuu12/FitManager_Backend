const express = require('express');
const router = express.Router();
const { sendReminder, handleIncomingWhatsApp } = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

// Ruta pública para Twilio (No lleva protect)
router.post('/whatsapp-webhook', handleIncomingWhatsApp);

// Rutas protegidas
router.use(protect);
router.post('/send-reminder/:id', sendReminder);

module.exports = router;
