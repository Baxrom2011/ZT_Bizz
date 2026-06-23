const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/users', auth, authController.getUsers);
router.put('/users/:id', auth, authController.updateUser);
router.delete('/users/:id', auth, authController.deleteUser); // Bu funksiya mavjud

module.exports = router;