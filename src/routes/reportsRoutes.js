const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authMiddleware } = require('../middleware/auth');

// All routes are protected
router.use(authMiddleware);

/**
 * @route   GET /api/reports/agent-performance
 * @desc    Get agent performance stats
 * @access  Private (Admin/Manager)
 */
router.get('/agent-performance', reportsController.getAgentPerformance);

/**
 * @route   GET /api/reports/project-performance
 * @desc    Get project performance stats
 * @access  Private (Admin/Manager)
 */
router.get('/project-performance', reportsController.getProjectPerformance);

/**
 * @route   GET /api/reports/daily-activity
 * @desc    Get daily activity stats
 * @access  Private (Admin/Manager)
 */
router.get('/daily-activity', reportsController.getDailyActivity);

module.exports = router;
