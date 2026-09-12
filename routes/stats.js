const express = require('express');
const { getStats } = require('../controllers/statsController');

const router = express.Router();

// GET /api/stats — dashboard statistics
router.get('/', getStats);

module.exports = router;
