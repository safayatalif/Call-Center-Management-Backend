const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const employeeController = require('../controllers/employeeController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

/**
 * @route   GET /api/employees
 * @desc    Get all employees
 * @access  Private (Admin/Manager)
 */
router.get('/', authMiddleware, employeeController.getAllEmployees);

/**
 * @route   GET /api/employees/:id
 * @desc    Get employee by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, employeeController.getEmployeeById);

/**
 * @route   POST /api/employees
 * @desc    Create new employee
 * @access  Private (Admin only)
 */
router.post('/', [
    authMiddleware,
    // roleMiddleware(['ADMIN']), // Uncomment to enforce role check
    check('name', 'Name is required').not().isEmpty(),
    check('emailidoffical', 'Please include a valid email').isEmail(),
    check('username', 'Username is required').not().isEmpty(),
    check('entrypass', 'Password must be at least 6 characters').isLength({ min: 6 })
], employeeController.createEmployee);

/**
 * @route   PUT /api/employees/:id
 * @desc    Update employee
 * @access  Private (Admin/Manager)
 */
router.put('/:id', authMiddleware, employeeController.updateEmployee);

/**
 * @route   DELETE /api/employees/:id
 * @desc    Delete employee
 * @access  Private (Admin only)
 */
router.delete('/:id', authMiddleware, employeeController.deleteEmployee);

module.exports = router;
