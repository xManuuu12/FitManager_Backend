const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visitController');

// Todas las rutas de visitas están protegidas y filtradas por el contexto del gimnasio (req.user)
router.get('/', visitController.getAllVisits);
router.get('/stats/today', visitController.getTodayStats);
router.post('/', visitController.createVisit);
router.get('/check-status/:id', visitController.checkMemberStatus);

module.exports = router;
