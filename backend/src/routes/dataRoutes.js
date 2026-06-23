const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Public routes (no auth needed)
router.post('/login', authController.login);
router.post('/register', authController.register);

// Protected routes (auth needed)
router.get('/users', auth, authController.getUsers);
router.put('/users/:id', auth, authController.updateUser);
router.delete('/users/:id', auth, authController.deleteUser);

module.exports = router;