const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route   GET /api/assignments/project/:projectId
 * @desc    Get employees and customers for a project
 * @access  Private
 */
router.get('/project/:projectId', authMiddleware, assignmentController.getProjectData);

/**
 * @route   GET /api/assignments/project/:projectId/unassigned
 * @desc    Get unassigned customers for a project
 * @access  Private
 */
router.get('/project/:projectId/unassigned', authMiddleware, assignmentController.getUnassignedCustomers);

/**
 * @route   POST /api/assignments
 * @desc    Assign customers to employee
 * @access  Private
 */
router.post('/', authMiddleware, assignmentController.assignCustomers);

/**
 * @route   GET /api/assignments
 * @desc    Get all assignments
 * @access  Private
 */
router.get('/', authMiddleware, assignmentController.getAllAssignments);

/**
 * @route   PUT /api/assignments/:id
 * @desc    Update assignment
 * @access  Private
 */
router.put('/:id', authMiddleware, assignmentController.updateAssignment);

/**
 * @route   DELETE /api/assignments/:id
 * @desc    Delete assignment
 * @access  Private
 */
router.delete('/:id', authMiddleware, assignmentController.deleteAssignment);

module.exports = router;
