const pool = require('../config/database');

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        // Get total counts
        const [employeesCount, projectsCount, callsCount, pendingCallsCount] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM employees WHERE empstatus = $1', ['Active']),
            pool.query('SELECT COUNT(*) FROM projects WHERE projectstatus = $1', ['OPEN']),
            pool.query('SELECT COUNT(*) FROM calls'),
            pool.query('SELECT COUNT(*) FROM calls WHERE status = $1', ['pending'])
        ]);

        // Get recent calls
        const recentCalls = await pool.query(`
      SELECT c.*, e.name as employee_name, p.projectname as project_name
      FROM calls c
      LEFT JOIN employees e ON c.employee_id = e.empno_pk
      LEFT JOIN projects p ON c.project_id = p.projectno_pk
      ORDER BY c.created_at DESC
      LIMIT 10
    `);

        // Get call status distribution
        const callStatusStats = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM calls
      GROUP BY status
    `);

        // Get employees by role
        const employeesByRole = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM employees
      WHERE empstatus = 'Active'
      GROUP BY role
    `);

        res.json({
            success: true,
            data: {
                stats: {
                    totalEmployees: parseInt(employeesCount.rows[0].count),
                    totalAgents: parseInt(employeesCount.rows[0].count), // For backward compatibility
                    totalProjects: parseInt(projectsCount.rows[0].count),
                    totalCalls: parseInt(callsCount.rows[0].count),
                    pendingCalls: parseInt(pendingCallsCount.rows[0].count)
                },
                recentCalls: recentCalls.rows,
                callStatusDistribution: callStatusStats.rows,
                employeesByRole: employeesByRole.rows
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching dashboard data',
            error: error.message
        });
    }
};

/**
 * Get all employees (agents)
 */
exports.getAgents = async (req, res) => {
    try {
        const employees = await pool.query(`
      SELECT e.*, p.projectname as project_name
      FROM employees e
      LEFT JOIN projects p ON e.assigned_project_id = p.projectno_pk
      WHERE e.empstatus = 'Active'
      ORDER BY e.au_entryat DESC
    `);

        res.json({
            success: true,
            data: employees.rows
        });

    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching employees',
            error: error.message
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
        COUNT(DISTINCT e.empno_pk) as employee_count,
        COUNT(DISTINCT c.id) as call_count
      FROM projects p
      LEFT JOIN employees e ON p.projectno_pk = e.assigned_project_id
      LEFT JOIN calls c ON p.projectno_pk = c.project_id
      GROUP BY p.projectno_pk
      ORDER BY p.au_entryat DESC
    `);

        res.json({
            success: true,
            data: projects.rows
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
 * Get all calls
 */
exports.getCalls = async (req, res) => {
    try {
        const { status, employee_id, agent_id, project_id } = req.query;

        let query = `
      SELECT c.*, e.name as employee_name, e.name as agent_name, p.projectname as project_name
      FROM calls c
      LEFT JOIN employees e ON c.employee_id = e.empno_pk
      LEFT JOIN projects p ON c.project_id = p.projectno_pk
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        if (status) {
            query += ` AND c.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        // Support both employee_id and agent_id for backward compatibility
        const empId = employee_id || agent_id;
        if (empId) {
            query += ` AND c.employee_id = $${paramCount}`;
            params.push(empId);
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
            message: 'Server error fetching calls',
            error: error.message
        });
    }
};
