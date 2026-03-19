const express = require('express');
const router = express.Router();
const {
  getAllMembresias,
  createMembresia,
  updateMembresia,
  deleteMembresia
} = require('../controllers/membresiaController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect); // Todas las rutas requieren auth

router.get('/', getAllMembresias);
router.post('/', authorize('admin'), createMembresia);
router.put('/:id', authorize('admin'), updateMembresia);
router.delete('/:id', authorize('admin'), deleteMembresia);

module.exports = router;
