const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Todas las rutas aquí estarán protegidas por el middleware `protect` desde app.js
router.get('/dashboard', analyticsController.getDashboardData);
router.get('/export', analyticsController.exportDashboardToExcel);

module.exports = router;
