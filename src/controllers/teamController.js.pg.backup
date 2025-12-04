const pool = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * Get all teams with filtering and pagination
 */
exports.getAllTeams = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            teamtype = ''
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build WHERE clause
        let whereConditions = [];
        let queryParams = [];
        let paramCount = 1;

        // Search filter
        if (search) {
            whereConditions.push(`(t.teamname ILIKE $${paramCount} OR t.teamcode ILIKE $${paramCount} OR t.teamdescription ILIKE $${paramCount})`);
            queryParams.push(`%${search}%`);
            paramCount++;
        }

        // Team type filter
        if (teamtype) {
            whereConditions.push(`t.teamtype = $${paramCount}`);
            queryParams.push(teamtype);
            paramCount++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM empteam t ${whereClause}`;
        const countResult = await pool.query(countQuery, queryParams);
        const totalTeams = parseInt(countResult.rows[0].count);

        // Get paginated results with team leader info and member count
        const dataQuery = `
            SELECT t.*,
                   e.name as teamlead_name,
                   e.emailidoffical as teamlead_email,
                   COUNT(DISTINCT td.teamdtlno_pk) as member_count
            FROM empteam t
            LEFT JOIN employees e ON t.teamlead_empno_fk = e.empno_pk
            LEFT JOIN empteamdtl td ON t.teamno_pk = td.teamno_fk
            ${whereClause}
            GROUP BY t.teamno_pk, e.name, e.emailidoffical
            ORDER BY t.au_entryat DESC
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
                totalPages: Math.ceil(totalTeams / parseInt(limit)),
                totalTeams: totalTeams,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching teams'
        });
    }
};

/**
 * Get single team by ID with members
 */
exports.getTeamById = async (req, res) => {
    try {
        const { id } = req.params;

        // Get team info
        const teamResult = await pool.query(`
            SELECT t.*,
                   e.name as teamlead_name,
                   e.emailidoffical as teamlead_email
            FROM empteam t
            LEFT JOIN employees e ON t.teamlead_empno_fk = e.empno_pk
            WHERE t.teamno_pk = $1
        `, [id]);

        if (teamResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        // Get team members
        const membersResult = await pool.query(`
            SELECT td.*,
                   e.name as employee_name,
                   e.emailidoffical as employee_email,
                   e.role as employee_role,
                   e.empcode as employee_code
            FROM empteamdtl td
            JOIN employees e ON td.team_empno_pk = e.empno_pk
            WHERE td.teamno_fk = $1
            ORDER BY td.au_entryat DESC
        `, [id]);

        const team = teamResult.rows[0];
        team.members = membersResult.rows;

        res.json({
            success: true,
            data: team
        });
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching team'
        });
    }
};

/**
 * Create new team
 */
exports.createTeam = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            teamcode,
            teamname,
            teamdescription,
            teamtype,
            teamlead_empno_fk,
            au_orgno
        } = req.body;

        const userId = req.user.id;

        // Create team
        const result = await pool.query(
            `INSERT INTO empteam (
                teamcode, teamname, teamdescription, teamtype,
                teamlead_empno_fk, au_orgno, au_entryempnoby, au_entryat
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            RETURNING *`,
            [
                teamcode || null,
                teamname,
                teamdescription || null,
                teamtype || null,
                teamlead_empno_fk || null,
                au_orgno || null,
                userId
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Team created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating team'
        });
    }
};

/**
 * Update team
 */
exports.updateTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user.id;

        // Check if team exists
        const teamCheck = await pool.query('SELECT * FROM empteam WHERE teamno_pk = $1', [id]);
        if (teamCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        // Build update query dynamically
        let updateFields = [];
        let values = [];
        let paramCount = 1;

        const allowedFields = [
            'teamcode', 'teamname', 'teamdescription', 'teamtype',
            'teamlead_empno_fk', 'au_orgno'
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
            UPDATE empteam SET ${updateFields.join(', ')}
            WHERE teamno_pk = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        res.json({
            success: true,
            message: 'Team updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating team'
        });
    }
};

/**
 * Delete team
 */
exports.deleteTeam = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM empteam WHERE teamno_pk = $1 RETURNING teamno_pk',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        res.json({
            success: true,
            message: 'Team deleted successfully'
        });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting team'
        });
    }
};

/**
 * Add member to team
 */
exports.addTeamMember = async (req, res) => {
    try {
        const { id } = req.params; // team id
        const { employee_id, remarks } = req.body;
        const userId = req.user.id;

        // Check if team exists
        const teamCheck = await pool.query('SELECT teamcode FROM empteam WHERE teamno_pk = $1', [id]);
        if (teamCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        const teamcode = teamCheck.rows[0].teamcode;

        // Check if employee exists
        const empCheck = await pool.query('SELECT empno_pk FROM employees WHERE empno_pk = $1', [employee_id]);
        if (empCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Check if already a member
        const memberCheck = await pool.query(
            'SELECT * FROM empteamdtl WHERE teamno_fk = $1 AND team_empno_pk = $2',
            [id, employee_id]
        );

        if (memberCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Employee is already a member of this team'
            });
        }

        // Add member
        const result = await pool.query(
            `INSERT INTO empteamdtl (
                teamno_fk, teamcode, team_empno_pk, remarks,
                au_entryempnoby, au_entryat
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING *`,
            [id, teamcode, employee_id, remarks || null, userId]
        );

        res.status(201).json({
            success: true,
            message: 'Team member added successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Add team member error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error adding team member'
        });
    }
};

/**
 * Remove member from team
 */
exports.removeTeamMember = async (req, res) => {
    try {
        const { id, memberId } = req.params;

        const result = await pool.query(
            'DELETE FROM empteamdtl WHERE teamno_fk = $1 AND teamdtlno_pk = $2 RETURNING teamdtlno_pk',
            [id, memberId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Team member not found'
            });
        }

        res.json({
            success: true,
            message: 'Team member removed successfully'
        });
    } catch (error) {
        console.error('Remove team member error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error removing team member'
        });
    }
};

/**
 * Get available employees (not in specific team)
 */
exports.getAvailableEmployees = async (req, res) => {
    try {
        const { teamId } = req.params;
        const { search = '' } = req.query;

        let query = `
            SELECT e.empno_pk, e.empcode, e.name, e.emailidoffical, e.role, e.empstatus
            FROM employees e
            WHERE e.empstatus = 'Active'
            AND e.empno_pk NOT IN (
                SELECT team_empno_pk FROM empteamdtl WHERE teamno_fk = $1
            )
        `;

        const params = [teamId];

        if (search) {
            query += ` AND (e.name ILIKE $2 OR e.emailidoffical ILIKE $2 OR e.empcode ILIKE $2)`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY e.name LIMIT 50`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get available employees error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching available employees'
        });
    }
};
