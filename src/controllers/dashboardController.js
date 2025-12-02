const pool = require('../config/database');

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        // Get total counts
        const [agentsCount, projectsCount, callsCount, pendingCallsCount] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM agents WHERE status = $1', ['active']),
            pool.query('SELECT COUNT(*) FROM projects WHERE status = $1', ['active']),
            pool.query('SELECT COUNT(*) FROM calls'),
            pool.query('SELECT COUNT(*) FROM calls WHERE status = $1', ['pending'])
        ]);

        // Get recent calls
        const recentCalls = await pool.query(`
      SELECT c.*, a.name as agent_name, p.name as project_name
      FROM calls c
      LEFT JOIN agents a ON c.agent_id = a.id
      LEFT JOIN projects p ON c.project_id = p.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `);

        // Get call status distribution
        const callStatusStats = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM calls
      GROUP BY status
    `);

        res.json({
            success: true,
            data: {
                stats: {
                    totalAgents: parseInt(agentsCount.rows[0].count),
                    totalProjects: parseInt(projectsCount.rows[0].count),
                    totalCalls: parseInt(callsCount.rows[0].count),
                    pendingCalls: parseInt(pendingCallsCount.rows[0].count)
                },
                recentCalls: recentCalls.rows,
                callStatusDistribution: callStatusStats.rows
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching dashboard data'
        });
    }
};

/**
 * Get all agents
 */
exports.getAgents = async (req, res) => {
    try {
        const agents = await pool.query(`
      SELECT a.*, p.name as project_name
      FROM agents a
      LEFT JOIN projects p ON a.assigned_project_id = p.id
      ORDER BY a.created_at DESC
    `);

        res.json({
            success: true,
            data: agents.rows
        });

    } catch (error) {
        console.error('Get agents error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching agents'
        });
    }
};

/**
 * Get all projects
 */
exports.getProjects = async (req, res) => {
    try {
        const projects = await pool.query(`
      SELECT p.*, 
        COUNT(DISTINCT a.id) as agent_count,
        COUNT(DISTINCT c.id) as call_count
      FROM projects p
      LEFT JOIN agents a ON p.id = a.assigned_project_id
      LEFT JOIN calls c ON p.id = c.project_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

        res.json({
            success: true,
            data: projects.rows
        });

    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching projects'
        });
    }
};

/**
 * Get all calls
 */
exports.getCalls = async (req, res) => {
    try {
        const { status, agent_id, project_id } = req.query;

        let query = `
      SELECT c.*, a.name as agent_name, p.name as project_name
      FROM calls c
      LEFT JOIN agents a ON c.agent_id = a.id
      LEFT JOIN projects p ON c.project_id = p.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        if (status) {
            query += ` AND c.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (agent_id) {
            query += ` AND c.agent_id = $${paramCount}`;
            params.push(agent_id);
            paramCount++;
        }

        if (project_id) {
            query += ` AND c.project_id = $${paramCount}`;
            params.push(project_id);
            paramCount++;
        }

        query += ' ORDER BY c.created_at DESC';

        const calls = await pool.query(query, params);

        res.json({
            success: true,
            data: calls.rows
        });

    } catch (error) {
        console.error('Get calls error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching calls'
        });
    }
};
