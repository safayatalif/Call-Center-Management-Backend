const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authMiddleware, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (Admin/Manager)
 */
router.get('/', authorize('ADMIN', 'MANAGER'), userController.getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin/Manager)
 */
router.get('/:id', authorize('ADMIN', 'MANAGER'), userController.getUserById);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Admin/Manager)
 */
router.post(
    '/',
    authorize('ADMIN', 'MANAGER'),
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('role').optional().isIn(['ADMIN', 'MANAGER', 'AGENT', 'TRAINEE']).withMessage('Invalid role')
    ],
    userController.createUser
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin/Manager)
 */
router.put(
    '/:id',
    authorize('ADMIN', 'MANAGER'),
    [
        body('email').optional().isEmail().withMessage('Please provide a valid email'),
        body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('role').optional().isIn(['ADMIN', 'MANAGER', 'AGENT', 'TRAINEE']).withMessage('Invalid role')
    ],
    userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete('/:id', authorize('ADMIN'), userController.deleteUser);

/**
 * @route   PATCH /api/users/:id/inactivate
 * @desc    Inactivate user
 * @access  Private (Admin/Manager)
 */
router.patch('/:id/inactivate', authorize('ADMIN', 'MANAGER'), userController.inactivateUser);

module.exports = router;
