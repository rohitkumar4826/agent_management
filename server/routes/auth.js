const express = require('express');
const { loginUser, getCurrentUser } = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', loginUser);

// GET /api/auth/me
router.get('/me', auth, getCurrentUser);

module.exports = router;