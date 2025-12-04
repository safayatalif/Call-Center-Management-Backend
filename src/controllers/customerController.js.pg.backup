const pool = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * Get all customers with filtering and pagination
 */
exports.getAllCustomers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            projectId = '',
            custtype = ''
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build WHERE clause
        let whereConditions = [];
        let queryParams = [];
        let paramCount = 1;

        // Search filter
        if (search) {
            whereConditions.push(`(c.custname ILIKE $${paramCount} OR c.custcode ILIKE $${paramCount} OR c.custmobilenumber ILIKE $${paramCount} OR c.custemail ILIKE $${paramCount})`);
            queryParams.push(`%${search}%`);
            paramCount++;
        }

        // Project filter
        if (projectId) {
            whereConditions.push(`c.projectno_fk = $${paramCount}`);
            queryParams.push(projectId);
            paramCount++;
        }

        // Customer type filter
        if (custtype) {
            whereConditions.push(`c.custtype = $${paramCount}`);
            queryParams.push(custtype);
            paramCount++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM customer c ${whereClause}`;
        const countResult = await pool.query(countQuery, queryParams);
        const totalCustomers = parseInt(countResult.rows[0].count);

        // Get paginated results with project info
        const dataQuery = `
            SELECT c.*,
                   p.projectname as project_name,
                   p.projectcode as project_code
            FROM customer c
            LEFT JOIN projects p ON c.projectno_fk = p.projectno_pk
            ${whereClause}
            ORDER BY c.au_entryat DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        const result = await pool.query(dataQuery, [
            ...queryParams,
            parseInt(limit),
            offset
        ]);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCustomers / parseInt(limit)),
                totalCustomers: totalCustomers,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching customers',
            error: error.message
        });
    }
};

/**
 * Get single customer by ID
 */
exports.getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT c.*,
                   p.projectname as project_name,
                   p.projectcode as project_code
            FROM customer c
            LEFT JOIN projects p ON c.projectno_fk = p.projectno_pk
            WHERE c.custno_pk = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching customer',
            error: error.message
        });
    }
};

/**
 * Create new customer
 */
exports.createCustomer = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            custcode,
            projectno_fk,
            countrycode,
            custmobilenumber,
            custemail,
            custname,
            facebook_link,
            linkedin_link,
            other_link,
            call_link_type,
            text_note,
            contact_type,
            custarea,
            custfeedback,
            agentfeedback,
            never_callind,
            never_callind_message,
            custgender,
            custbirthdate,
            custtype,
            cust_labeling,
            au_orgno
        } = req.body;

        const userId = req.user.id;

        // Create customer
        const result = await pool.query(
            `INSERT INTO customer (
                custcode, projectno_fk, countrycode, custmobilenumber, custemail,
                custname, facebook_link, linkedin_link, other_link, call_link_type,
                text_note, contact_type, custarea, custfeedback, agentfeedback,
                never_callind, never_callind_message, custgender, custbirthdate,
                custtype, cust_labeling, au_orgno, au_entryempnoby, au_entryat
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, CURRENT_TIMESTAMP)
            RETURNING *`,
            [
                custcode || null,
                projectno_fk || null,
                countrycode || '+880',
                custmobilenumber || null,
                custemail || null,
                custname || null,
                facebook_link || null,
                linkedin_link || null,
                other_link || null,
                call_link_type || null,
                text_note || null,
                contact_type || null,
                custarea || null,
                custfeedback || null,
                agentfeedback || null,
                never_callind || null,
                never_callind_message || null,
                custgender || null,
                custbirthdate || null,
                custtype || 'Undefined',
                cust_labeling || null,
                au_orgno || null,
                userId
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating customer',
            error: error.message
        });
    }
};

/**
 * Update customer
 */
exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user.id;

        // Check if customer exists
        const customerCheck = await pool.query('SELECT * FROM customer WHERE custno_pk = $1', [id]);
        if (customerCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Build update query dynamically
        let updateFields = [];
        let values = [];
        let paramCount = 1;

        const allowedFields = [
            'custcode', 'projectno_fk', 'countrycode', 'custmobilenumber', 'custemail',
            'custname', 'facebook_link', 'linkedin_link', 'other_link', 'call_link_type',
            'text_note', 'contact_type', 'custarea', 'custfeedback', 'agentfeedback',
            'never_callind', 'never_callind_message', 'custgender', 'custbirthdate',
            'custtype', 'cust_labeling', 'au_orgno'
        ];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = $${paramCount++}`);
                values.push(updates[field]);
            }
        }

        updateFields.push(`au_updateempnoby = $${paramCount++}`);
        values.push(userId);

        updateFields.push(`au_updateat = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
            UPDATE customer SET ${updateFields.join(', ')}
            WHERE custno_pk = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        res.json({
            success: true,
            message: 'Customer updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating customer',
            error: error.message
        });
    }
};

/**
 * Delete customer
 */
exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM customer WHERE custno_pk = $1 RETURNING custno_pk',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.json({
            success: true,
            message: 'Customer deleted successfully'
        });
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting customer',
            error: error.message
        });
    }
};
