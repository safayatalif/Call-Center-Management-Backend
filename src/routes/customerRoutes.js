const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route   GET /api/customers
 * @desc    Get all customers
 * @access  Private
 */
router.get('/', authMiddleware, customerController.getAllCustomers);

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, customerController.getCustomerById);

/**
 * @route   POST /api/customers
 * @desc    Create new customer
 * @access  Private
 */
router.post('/', authMiddleware, customerController.createCustomer);

/**
 * @route   PUT /api/customers/:id
 * @desc    Update customer
 * @access  Private
 */
router.put('/:id', authMiddleware, customerController.updateCustomer);

/**
 * @route   DELETE /api/customers/:id
 * @desc    Delete customer
 * @access  Private
 */
router.delete('/:id', authMiddleware, customerController.deleteCustomer);

module.exports = router;
