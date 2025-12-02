const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private
 */
router.get('/stats', authMiddleware, dashboardController.getDashboardStats);

/**
 * @route   GET /api/dashboard/agents
 * @desc    Get all agents
 * @access  Private
 */
router.get('/agents', authMiddleware, dashboardController.getAgents);

/**
 * @route   GET /api/dashboard/projects
 * @desc    Get all projects
 * @access  Private
 */
router.get('/projects', authMiddleware, dashboardController.getProjects);

/**
 * @route   GET /api/dashboard/calls
 * @desc    Get all calls (with optional filters)
 * @access  Private
 */
router.get('/calls', authMiddleware, dashboardController.getCalls);

module.exports = router;
