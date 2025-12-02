const pool = require('../config/database');

/**
 * Get employees and customers by project
 */
exports.getProjectData = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Get employees assigned to this project's team
        const employeesQuery = `
            SELECT DISTINCT e.empno_pk, e.empcode, e.name, e.emailidoffical, e.role
            FROM employees e
            INNER JOIN empteamdtl etd ON e.empno_pk = etd.team_empno_pk
            INNER JOIN empteam et ON etd.teamno_fk = et.teamno_pk
            INNER JOIN projects p ON p.projectdefault_teamno_fk = et.teamno_pk
            WHERE p.projectno_pk = $1 AND e.empstatus = 'Active'
            ORDER BY e.name
        `;

        // Get customers assigned to this project
        const customersQuery = `
            SELECT c.custno_pk, c.custcode, c.custname, c.custmobilenumber, 
                   c.custemail, c.custtype,
                   CASE 
                       WHEN ca.assignno_pk IS NOT NULL THEN true 
                       ELSE false 
                   END as is_assigned,
                   ca.empno_pk as assigned_to_empno,
                   e.name as assigned_to_name
            FROM customer c
            LEFT JOIN custassignment ca ON c.custno_pk = ca.custno_fk
            LEFT JOIN employees e ON ca.empno_pk = e.empno_pk
            WHERE c.projectno_fk = $1
            ORDER BY c.custname
        `;

        const [employees, customers] = await Promise.all([
            pool.query(employeesQuery, [projectId]),
            pool.query(customersQuery, [projectId])
        ]);

        res.json({
            success: true,
            data: {
                employees: employees.rows,
                customers: customers.rows
            }
        });
    } catch (error) {
        console.error('Get project data error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching project data',
            error: error.message
        });
    }
};

/**
 * Get unassigned customers for a project
 */
exports.getUnassignedCustomers = async (req, res) => {
    try {
        const { projectId } = req.params;

        const query = `
            SELECT c.custno_pk, c.custcode, c.custname, c.custmobilenumber, 
                   c.custemail, c.custtype
            FROM customer c
            LEFT JOIN custassignment ca ON c.custno_pk = ca.custno_fk
            WHERE c.projectno_fk = $1 AND ca.assignno_pk IS NULL
            ORDER BY c.custname
        `;

        const result = await pool.query(query, [projectId]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get unassigned customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching unassigned customers',
            error: error.message
        });
    }
};

/**
 * Assign multiple customers to an employee
 */
exports.assignCustomers = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            empno_pk,
            customer_ids,
            calltargetdate,
            callpriority
        } = req.body;

        const userId = req.user.id;

        await client.query('BEGIN');

        const assignments = [];

        for (const custno_fk of customer_ids) {
            // Get customer mobile number
            const customerResult = await client.query(
                'SELECT custmobilenumber FROM customer WHERE custno_pk = $1',
                [custno_fk]
            );

            const custmobilenumber = customerResult.rows[0]?.custmobilenumber || null;

            // Create assignment
            const result = await client.query(
                `INSERT INTO custassignment (
                    assigndate, calltargetdate, custno_fk, custmobilenumber,
                    empno_pk, callpriority, callstatus, au_entryempnoby, au_entryat
                ) VALUES (CURRENT_TIMESTAMP, $1, $2, $3, $4, $5, 'Pending', $6, CURRENT_TIMESTAMP)
                RETURNING *`,
                [
                    calltargetdate || null,
                    custno_fk,
                    custmobilenumber,
                    empno_pk,
                    callpriority || 'Low',
                    userId
                ]
            );

            assignments.push(result.rows[0]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: `Successfully assigned ${assignments.length} customer(s)`,
            data: assignments
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Assign customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error assigning customers',
            error: error.message
        });
    } finally {
        client.release();
    }
};

/**
 * Get all assignments with filters
 */
exports.getAllAssignments = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            empno_pk,
            callstatus,
            callpriority
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereConditions = [];
        let queryParams = [];
        let paramCount = 1;

        if (empno_pk) {
            whereConditions.push(`ca.empno_pk = $${paramCount}`);
            queryParams.push(empno_pk);
            paramCount++;
        }

        if (callstatus) {
            whereConditions.push(`ca.callstatus = $${paramCount}`);
            queryParams.push(callstatus);
            paramCount++;
        }

        if (callpriority) {
            whereConditions.push(`ca.callpriority = $${paramCount}`);
            queryParams.push(callpriority);
            paramCount++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM custassignment ca ${whereClause}`;
        const countResult = await pool.query(countQuery, queryParams);
        const totalAssignments = parseInt(countResult.rows[0].count);

        // Get paginated results
        const dataQuery = `
            SELECT ca.*,
                   c.custname, c.custcode, c.custemail,
                   e.name as employee_name, e.empcode as employee_code,
                   p.projectname, p.projectcode
            FROM custassignment ca
            INNER JOIN customer c ON ca.custno_fk = c.custno_pk
            INNER JOIN employees e ON ca.empno_pk = e.empno_pk
            LEFT JOIN projects p ON c.projectno_fk = p.projectno_pk
            ${whereClause}
            ORDER BY ca.assigndate DESC
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
                totalPages: Math.ceil(totalAssignments / parseInt(limit)),
                totalAssignments: totalAssignments,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching assignments',
            error: error.message
        });
    }
};

/**
 * Update assignment
 */
exports.updateAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user.id;

        // Build update query dynamically
        let updateFields = [];
        let values = [];
        let paramCount = 1;

        const allowedFields = [
            'calltargetdate', 'calleddatetime', 'callpriority', 'callstatus',
            'callstatus_text', 'followupdate', 'count_call', 'count_message'
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
            UPDATE custassignment SET ${updateFields.join(', ')}
            WHERE assignno_pk = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        res.json({
            success: true,
            message: 'Assignment updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating assignment',
            error: error.message
        });
    }
};

/**
 * Delete assignment
 */
exports.deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM custassignment WHERE assignno_pk = $1 RETURNING assignno_pk',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        res.json({
            success: true,
            message: 'Assignment deleted successfully'
        });
    } catch (error) {
        console.error('Delete assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting assignment',
            error: error.message
        });
    }
};
