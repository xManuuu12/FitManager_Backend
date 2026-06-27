const express = require('express');
const router = express.Router();
const { register, login, getMe, logout, getUsers, createStaff, updateUser, deleteUser } = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.get('/users', protect, getUsers);

// Ruta para que un Admin cree personal para su gimnasio
router.post('/staff', protect, authorize('admin'), createStaff);

// Ruta para que un Admin actualice un usuario de su gimnasio
router.put('/users/:id', protect, authorize('admin'), updateUser);

// Ruta para que un Admin elimine un usuario de su gimnasio
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
