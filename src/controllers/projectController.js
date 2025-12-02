const pool = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * Get all projects with filtering and pagination
 */
exports.getAllProjects = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = '',
            teamId = ''
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build WHERE clause
        let whereConditions = [];
        let queryParams = [];
        let paramCount = 1;

        // Search filter
        if (search) {
            whereConditions.push(`(p.projectname ILIKE $${paramCount} OR p.projectcode ILIKE $${paramCount} OR p.projectcompanyname ILIKE $${paramCount})`);
            queryParams.push(`%${search}%`);
            paramCount++;
        }

        // Status filter
        if (status) {
            whereConditions.push(`p.projectstatus = $${paramCount}`);
            queryParams.push(status);
            paramCount++;
        }

        // Team filter
        if (teamId) {
            whereConditions.push(`p.projectdefault_teamno_fk = $${paramCount}`);
            queryParams.push(teamId);
            paramCount++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM projects p ${whereClause}`;
        const countResult = await pool.query(countQuery, queryParams);
        const totalProjects = parseInt(countResult.rows[0].count);

        // Get paginated results with team info
        const dataQuery = `
            SELECT p.*,
                   t.teamname as team_name,
                   t.teamcode as team_code,
                   COUNT(DISTINCT c.id) as call_count
            FROM projects p
            LEFT JOIN empteam t ON p.projectdefault_teamno_fk = t.teamno_pk
            LEFT JOIN calls c ON p.projectno_pk = c.project_id
            ${whereClause}
            GROUP BY p.projectno_pk, t.teamname, t.teamcode
            ORDER BY p.au_entryat DESC
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
                totalPages: Math.ceil(totalProjects / parseInt(limit)),
                totalProjects: totalProjects,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching projects',
            error: error.message
        });
    }
};

/**
 * Get single project by ID
 */
exports.getProjectById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT p.*,
                   t.teamname as team_name,
                   t.teamcode as team_code,
                   COUNT(DISTINCT c.id) as call_count
            FROM projects p
            LEFT JOIN empteam t ON p.projectdefault_teamno_fk = t.teamno_pk
            LEFT JOIN calls c ON p.projectno_pk = c.project_id
            WHERE p.projectno_pk = $1
            GROUP BY p.projectno_pk, t.teamname, t.teamcode
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching project',
            error: error.message
        });
    }
};

/**
 * Create new project
 */
exports.createProject = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            projectcode,
            projectname,
            projectstartdate,
            projectenddate,
            projectstatus,
            projectdefault_teamno_fk,
            projectrestrictedind,
            projectcompanyname,
            projectcontacts,
            au_orgno
        } = req.body;

        const userId = req.user.id;

        // Create project
        const result = await pool.query(
            `INSERT INTO projects (
                projectcode, projectname, projectstartdate, projectenddate,
                projectstatus, projectdefault_teamno_fk, projectrestrictedind,
                projectcompanyname, projectcontacts, au_orgno, au_entryempnoby, au_entryat
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
            RETURNING *`,
            [
                projectcode || null,
                projectname,
                projectstartdate || null,
                projectenddate || null,
                projectstatus || 'OPEN',
                projectdefault_teamno_fk || null,
                projectrestrictedind || 'N',
                projectcompanyname || null,
                projectcontacts || null,
                au_orgno || null,
                userId
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating project',
            error: error.message
        });
    }
};

/**
 * Update project
 */
exports.updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user.id;

        // Check if project exists
        const projectCheck = await pool.query('SELECT * FROM projects WHERE projectno_pk = $1', [id]);
        if (projectCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Build update query dynamically
        let updateFields = [];
        let values = [];
        let paramCount = 1;

        const allowedFields = [
            'projectcode', 'projectname', 'projectstartdate', 'projectenddate',
            'projectstatus', 'projectdefault_teamno_fk', 'projectrestrictedind',
            'projectcompanyname', 'projectcontacts', 'au_orgno'
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
            UPDATE projects SET ${updateFields.join(', ')}
            WHERE projectno_pk = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        res.json({
            success: true,
            message: 'Project updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating project',
            error: error.message
        });
    }
};

/**
 * Delete project
 */
exports.deleteProject = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM projects WHERE projectno_pk = $1 RETURNING projectno_pk',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting project',
            error: error.message
        });
    }
};

/**
 * Get project statistics
 */
exports.getProjectStats = async (req, res) => {
    try {
        const { id } = req.params;

        const stats = await pool.query(`
            SELECT 
                COUNT(DISTINCT c.id) as total_calls,
                COUNT(DISTINCT CASE WHEN c.status = 'pending' THEN c.id END) as pending_calls,
                COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_calls,
                COUNT(DISTINCT c.employee_id) as unique_employees
            FROM projects p
            LEFT JOIN calls c ON p.projectno_pk = c.project_id
            WHERE p.projectno_pk = $1
            GROUP BY p.projectno_pk
        `, [id]);

        res.json({
            success: true,
            data: stats.rows[0] || {
                total_calls: 0,
                pending_calls: 0,
                completed_calls: 0,
                unique_employees: 0
            }
        });
    } catch (error) {
        console.error('Get project stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching project statistics',
            error: error.message
        });
    }
};
