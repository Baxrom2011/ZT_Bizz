const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const { auth } = require('../middleware/auth');

// Public routes (with auth)
router.get('/all', auth, dataController.getAllData);
router.post('/sync', auth, dataController.saveAllData);

// Record routes
router.get('/records', auth, dataController.getRecordsByDate);
router.get('/stats', auth, dataController.getMonthStats);
router.post('/records', auth, dataController.createRecord);
router.put('/records/:id', auth, dataController.updateRecord);
router.delete('/records/:id', auth, dataController.deleteRecord);

// Chat routes
router.get('/chat', auth, dataController.getChatMessages);
router.post('/chat', auth, dataController.addChatMessage);

module.exports = router;