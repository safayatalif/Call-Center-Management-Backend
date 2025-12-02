const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const projectController = require('../controllers/projectController');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route   GET /api/projects
 * @desc    Get all projects
 * @access  Private
 */
router.get('/', authMiddleware, projectController.getAllProjects);

/**
 * @route   GET /api/projects/:id
 * @desc    Get project by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, projectController.getProjectById);

/**
 * @route   POST /api/projects
 * @desc    Create new project
 * @access  Private
 */
router.post('/', [
    authMiddleware,
    check('projectname', 'Project name is required').not().isEmpty()
], projectController.createProject);

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Private
 */
router.put('/:id', authMiddleware, projectController.updateProject);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Private
 */
router.delete('/:id', authMiddleware, projectController.deleteProject);

/**
 * @route   GET /api/projects/:id/stats
 * @desc    Get project statistics
 * @access  Private
 */
router.get('/:id/stats', authMiddleware, projectController.getProjectStats);

module.exports = router;
