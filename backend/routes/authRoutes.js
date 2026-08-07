const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const tenantMiddleware = require('../middleware/tenantMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.put('/profile', tenantMiddleware, authController.updateProfile);

module.exports = router;

