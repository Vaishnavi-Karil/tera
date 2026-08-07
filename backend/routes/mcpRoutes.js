const express = require('express');
const router = express.Router();
const mcpController = require('../controllers/mcpController');

// Server routes
router.get('/servers', mcpController.listServers);
router.post('/servers', mcpController.createOrUpdateServer);
router.post('/servers/:id/discover', mcpController.discoverServerTools);

// Tool routes
router.get('/tools', mcpController.listTools);
router.post('/tools/:id/toggle', mcpController.toggleTool);

// Permission routes
router.get('/permissions', mcpController.listPermissions);
router.post('/permissions', mcpController.updatePermission);

module.exports = router;
