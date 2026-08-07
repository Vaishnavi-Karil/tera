const express = require('express');
const router = express.Router();
const connectionsController = require('../controllers/connectionsController');

// Get all connection statuses
router.get('/', connectionsController.getConnectionsStatus);

// Initiate linking (OAuth redirect or Bridge App setup)
router.post('/link/:platform', connectionsController.initiateLink);

// OAuth callback from provider
router.get('/callback/:platform', connectionsController.handleCallback);

module.exports = router;