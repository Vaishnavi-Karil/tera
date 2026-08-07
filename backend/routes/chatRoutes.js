const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Session routes
router.get('/sessions', chatController.listSessions);
router.post('/sessions', chatController.createSession);
router.delete('/sessions/:id', chatController.deleteSession);

// Message routes
router.get('/sessions/:id/messages', chatController.getSessionMessages);
router.post('/sessions/:id/messages', chatController.sendMessage);

// Daily summaries route
router.get('/daily-summaries', chatController.getDailySummaries);

// AI Status route
router.get('/status', (req, res) => {
  res.json({
    useLocalModel: process.env.USE_LOCAL_MODEL === 'true',
    localModelName: process.env.LOCAL_MODEL_NAME || 'gemma2:2b',
    hasGeminiKey: !!process.env.GEMINI_API_KEY
  });
});

module.exports = router;
