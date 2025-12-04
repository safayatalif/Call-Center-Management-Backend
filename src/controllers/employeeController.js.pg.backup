const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

/**
 * Get all employees with filtering and pagination
 */
exports.getAllEmployees = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            role = '',
            status = ''
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build WHERE clause
        let whereConditions = [];
        let queryParams = [];
        let paramCount = 1;

        // Search filter (name, email, username, empcode)
        if (search) {
            whereConditions.push(`(name ILIKE $${paramCount} OR emailidoffical ILIKE $${paramCount} OR username ILIKE $${paramCount} OR empcode ILIKE $${paramCount})`);
            queryParams.push(`%${search}%`);
            paramCount++;
        }

        // Role filter
        if (role) {
            whereConditions.push(`role = $${paramCount}`);
            queryParams.push(role);
            paramCount++;
        }

        // Status filter
        if (status) {
            whereConditions.push(`empstatus = $${paramCount}`);
            queryParams.push(status);
            paramCount++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM employees ${whereClause}`;
        const countResult = await pool.query(countQuery, queryParams);
        const totalEmployees = parseInt(countResult.rows[0].count);

        // Get paginated results
        const dataQuery = `
            SELECT *
            FROM employees 
            ${whereClause}
            ORDER BY empno_pk DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        const result = await pool.query(dataQuery, [
            ...queryParams,
            parseInt(limit),
            offset
        ]);

        // Remove passwords from response
        const employees = result.rows.map(emp => {
            const { entrypass, ...empData } = emp;
            return empData;
        });

        res.json({
            success: true,
            data: employees,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalEmployees / parseInt(limit)),
                totalEmployees: totalEmployees,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching employees'
        });
    }
};

/**
 * Get single employee by ID
 */
exports.getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT *
            FROM employees 
            WHERE empno_pk = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const { entrypass, ...employee } = result.rows[0];

        res.json({
            success: true,
            data: employee
        });
    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching employee'
        });
    }
};

/**
 * Create new employee
 */
exports.createEmployee = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            empcode,
            joindate,
            name,
            role,
            capacity,
            officialmobilenum,
            personalmobilenum,
            socialmediaidofficial,
            emailidoffical,
            address,
            empremarks,
            empstatus,
            restricteddataprivilege,
            app_userind,
            username,
            entrypass,
            au_orgno,
            assigned_project_id
        } = req.body;

        // Check if employee already exists (email or username)
        const existingEmployee = await pool.query(
            'SELECT * FROM employees WHERE emailidoffical = $1 OR username = $2',
            [emailidoffical, username]
        );

        if (existingEmployee.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Employee already exists with this email or username'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(entrypass, salt);

        // Create employee
        const result = await pool.query(
            `INSERT INTO employees (
                empcode, joindate, name, role, capacity, 
                officialmobilenum, personalmobilenum, socialmediaidofficial, 
                emailidoffical, address, empremarks, empstatus, 
                restricteddataprivilege, app_userind, username, entrypass, 
                au_orgno, au_entryat, assigned_project_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, $18) 
            RETURNING *`,
            [
                empcode || null,
                joindate || new Date(),
                name,
                role || 'AGENT',
                capacity || 0,
                officialmobilenum || null,
                personalmobilenum || null,
                socialmediaidofficial || null,
                emailidoffical,
                address || null,
                empremarks || null,
                empstatus || 'Active',
                restricteddataprivilege || 'N',
                app_userind || null,
                username,
                passwordHash,
                au_orgno || null,
                assigned_project_id || null
            ]
        );

        const { entrypass: _, ...newEmployee } = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: newEmployee
        });
    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating employee'
        });
    }
};

/**
 * Update employee
 */
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Check if employee exists
        const empCheck = await pool.query('SELECT * FROM employees WHERE empno_pk = $1', [id]);
        if (empCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // If email/username is being changed, check uniqueness
        if ((updates.emailidoffical && updates.emailidoffical !== empCheck.rows[0].emailidoffical) ||
            (updates.username && updates.username !== empCheck.rows[0].username)) {
            const duplicateCheck = await pool.query(
                'SELECT * FROM employees WHERE (emailidoffical = $1 OR username = $2) AND empno_pk != $3',
                [updates.emailidoffical || '', updates.username || '', id]
            );
            if (duplicateCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email or username already in use by another employee'
                });
            }
        }

        // Handle password update
        if (updates.entrypass) {
            const salt = await bcrypt.genSalt(10);
            updates.entrypass = await bcrypt.hash(updates.entrypass, salt);
        }

        // Build update query dynamically
        let updateFields = [];
        let values = [];
        let paramCount = 1;

        const allowedFields = [
            'empcode', 'joindate', 'name', 'role', 'capacity',
            'officialmobilenum', 'personalmobilenum', 'socialmediaidofficial',
            'emailidoffical', 'address', 'empremarks', 'empstatus',
            'restricteddataprivilege', 'app_userind', 'username', 'entrypass',
            'au_orgno', 'au_updateempnoby', 'assigned_project_id'
        ];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = $${paramCount++}`);
                values.push(updates[field]);
            }
        }

        updateFields.push(`au_updateat = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
            UPDATE employees SET ${updateFields.join(', ')}
            WHERE empno_pk = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        const { entrypass: _, ...updatedEmployee } = result.rows[0];

        res.json({
            success: true,
            message: 'Employee updated successfully',
            data: updatedEmployee
        });
    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating employee'
        });
    }
};

/**
 * Delete employee
 */
exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM employees WHERE empno_pk = $1 RETURNING empno_pk',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            message: 'Employee deleted successfully'
        });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting employee'
        });
    }
};
