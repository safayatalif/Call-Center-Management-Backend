const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * User login controller
 * Authenticates user and returns JWT token
 */
exports.login = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body; // email can be email or username

        // Check if employee exists (by email or username)
        const [empRows] = await pool.execute(
            'SELECT * FROM employees WHERE emailidoffical = ? OR username = ?',
            [email, email]
        );

        if (empRows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const employee = empRows[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, employee.entrypass);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: employee.empno_pk,
                email: employee.emailidoffical,
                role: employee.role,
                username: employee.username
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        // Return employee data (without password)
        const { entrypass, ...empData } = employee;

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: empData // Keep 'user' key for frontend compatibility
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

/**
 * User registration controller
 * Creates a new employee account (simplified for now)
 */
exports.register = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, email, password, role, username } = req.body;

        // Check if employee already exists
        const [existingEmp] = await pool.execute(
            'SELECT * FROM employees WHERE emailidoffical = ? OR username = ?',
            [email, username || email]
        );

        if (existingEmp.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Employee already exists with this email or username'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create employee
        const [result] = await pool.execute(
            `INSERT INTO employees (
                name, emailidoffical, entrypass, role, username, 
                joindate, empstatus, restricteddataprivilege
            ) 
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'Active', 'N')`,
            [
                name,
                email,
                passwordHash,
                role || 'AGENT',
                username || email // Fallback username to email if not provided
            ]
        );

        // Fetch the newly created employee
        const [newEmpRows] = await pool.execute(
            'SELECT * FROM employees WHERE empno_pk = ?',
            [result.insertId]
        );

        const employee = newEmpRows[0];

        // Generate JWT token
        const token = jwt.sign(
            {
                id: employee.empno_pk,
                email: employee.emailidoffical,
                role: employee.role,
                username: employee.username
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        const { entrypass, ...empData } = employee;

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: empData
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const [empRows] = await pool.execute(
            'SELECT * FROM employees WHERE empno_pk = ?',
            [userId]
        );

        if (empRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { entrypass, ...empData } = empRows[0];

        res.json({
            success: true,
            user: empData
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * Update password
 */
exports.updatePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        // Get user
        const [empRows] = await pool.execute(
            'SELECT * FROM employees WHERE empno_pk = ?',
            [userId]
        );

        if (empRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const employee = empRows[0];

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, employee.entrypass);

        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Incorrect current password'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update password
        await pool.execute(
            'UPDATE employees SET entrypass = ? WHERE empno_pk = ?',
            [passwordHash, userId]
        );

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating password'
        });
    }
};
