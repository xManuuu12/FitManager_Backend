const express = require('express');
const router = express.Router();
const { sendReminder } = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/send-reminder/:id', sendReminder);

module.exports = router;
