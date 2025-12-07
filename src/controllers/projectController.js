const pool = require("../config/database");
const { validationResult } = require("express-validator");

/**
 * Get all projects with filtering and pagination
 */
exports.getAllProjects = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      teamId = "",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    // Search filter
    if (search) {
      whereConditions.push(
        `(LOWER(p.projectname) LIKE ? OR LOWER(p.projectcode) LIKE ?)`
      );
      queryParams.push(
        `%${search.toLowerCase()}%`,
        `%${search.toLowerCase()}%`
      );
    }

    // Status filter
    if (status) {
      whereConditions.push(`p.projectstatus = ?`);
      queryParams.push(status);
    }

    // Team filter
    if (teamId) {
      whereConditions.push(`p.projectdefault_teamno_fk = ?`);
      queryParams.push(teamId);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM projects p ${whereClause}`;
    const [countRows] = await pool.query(countQuery, queryParams);
    const totalProjects =
      countRows && countRows[0] ? parseInt(countRows[0].count) : 0;

    // Get paginated results
    queryParams.push(parseInt(limit), offset);
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
            LIMIT ? OFFSET ?
        `;

    const [rows] = await pool.query(dataQuery, queryParams);

    res.json({
      success: true,
      data: rows || [],
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProjects / parseInt(limit)),
        totalProjects: totalProjects,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching projects",
      error: error.message,
    });
  }
};

/**
 * Get single project by ID
 */
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      `
            SELECT p.*,
                   t.teamname as team_name,
                   t.teamcode as team_code,
                   COUNT(DISTINCT c.id) as call_count
            FROM projects p
            LEFT JOIN empteam t ON p.projectdefault_teamno_fk = t.teamno_pk
            LEFT JOIN calls c ON p.projectno_pk = c.project_id
            WHERE p.projectno_pk = ?
            GROUP BY p.projectno_pk, t.teamname, t.teamcode
        `,
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching project",
      error: error.message,
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
        errors: errors.array(),
      });
    }

    const {
      projectcode,
      projectname,
      projectdescription,
      projectstatus,
      projectdefault_teamno_fk,
      au_orgno,
    } = req.body;

    const userId = req.user.id;

    // Create project
    const [result] = await pool.execute(
      `INSERT INTO projects (
                projectcode, projectname, projectdescription,
                projectstatus, projectdefault_teamno_fk, au_orgno, au_entryempnoby, au_entryat
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `,
      [
        projectcode || null,
        projectname,
        projectdescription || null,
        projectstatus || "OPEN",
        projectdefault_teamno_fk || null,
        au_orgno || null,
        userId,
      ]
    );

    // Fetch the created project
    const [newProject] = await pool.execute(
      "SELECT * FROM projects WHERE projectno_pk = ?",
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: newProject[0],
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating project",
      error: error.message,
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
    const [projectCheck] = await pool.execute(
      "SELECT * FROM projects WHERE projectno_pk = ?",
      [id]
    );
    if (projectCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Build update query dynamically
    let updateFields = [];
    let values = [];

    const allowedFields = [
      "projectcode",
      "projectname",
      "projectdescription",
      "projectstatus",
      "projectdefault_teamno_fk",
      "au_orgno",
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    updateFields.push(`au_updateempnoby = ?`);
    values.push(userId);

    updateFields.push(`au_updateat = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
            UPDATE projects SET ${updateFields.join(", ")}
            WHERE projectno_pk = ?
        `;

    const [result] = await pool.execute(query, values);

    // Fetch updated project
    const [updatedProject] = await pool.execute(
      "SELECT * FROM projects WHERE projectno_pk = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject[0],
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating project",
      error: error.message,
    });
  }
};

/**
 * Delete project
 */
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      "DELETE FROM projects WHERE projectno_pk = ?",
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting project",
      error: error.message,
    });
  }
};

/**
 * Get project statistics
 */
exports.getProjectStats = async (req, res) => {
  try {
    const { id } = req.params;

    const [stats] = await pool.execute(
      `
            SELECT 
                COUNT(DISTINCT c.id) as total_calls,
                COUNT(DISTINCT CASE WHEN c.status = 'pending' THEN c.id END) as pending_calls,
                COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_calls,
                COUNT(DISTINCT c.employee_id) as unique_employees
            FROM projects p
            LEFT JOIN calls c ON p.projectno_pk = c.project_id
            WHERE p.projectno_pk = ?
            GROUP BY p.projectno_pk
        `,
      [id]
    );

    res.json({
      success: true,
      data: stats[0] || {
        total_calls: 0,
        pending_calls: 0,
        completed_calls: 0,
        unique_employees: 0,
      },
    });
  } catch (error) {
    console.error("Get project stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching project statistics",
      error: error.message,
    });
  }
};
