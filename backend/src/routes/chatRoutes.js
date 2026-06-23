const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { auth } = require('../middleware/auth');

router.get('/', auth, chatController.getChatMessages);
router.post('/', auth, chatController.addChatMessage);
router.delete('/:id', auth, chatController.deleteChatMessage);
router.delete('/clear/all', auth, chatController.clearChat);

module.exports = router;