const pool = require("../config/database");
const { validationResult } = require("express-validator");

/**
 * Get all teams with filtering and pagination
 */
exports.getAllTeams = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", teamtype = "" } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    // Search filter
    if (search) {
      whereConditions.push(
        `(LOWER(t.teamname) LIKE ? OR LOWER(t.teamcode) LIKE ?)`
      );
      queryParams.push(
        `%${search.toLowerCase()}%`,
        `%${search.toLowerCase()}%`
      );
    }

    // Team type filter (column doesn't exist in current schema)
    // if (teamtype) {
    //     whereConditions.push(`t.teamtype = ?`);
    //     queryParams.push(teamtype);
    // }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM empteam t ${whereClause}`;
    const [countRows] = await pool.query(countQuery, queryParams);
    const totalTeams =
      countRows && countRows[0] ? parseInt(countRows[0].count) : 0;

    // Get paginated results with member count
    queryParams.push(parseInt(limit), offset);
    const dataQuery = `
            SELECT t.*,
                   COUNT(DISTINCT td.teamdtlno_pk) as member_count
            FROM empteam t
            LEFT JOIN empteamdtl td ON t.teamno_pk = td.teamno_fk
            ${whereClause}
            GROUP BY t.teamno_pk
            ORDER BY t.au_entryat DESC
            LIMIT ? OFFSET ?
        `;

    const [rows] = await pool.query(dataQuery, queryParams);

    res.json({
      success: true,
      data: rows || [],
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTeams / parseInt(limit)),
        totalTeams: totalTeams,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get teams error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching teams",
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
    const [teamResult] = await pool.execute(
      `
            SELECT t.*
            FROM empteam t
            WHERE t.teamno_pk = ?
        `,
      [id]
    );

    if (teamResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    // Get team members
    const [membersResult] = await pool.execute(
      `
            SELECT td.*,
                   e.name as employee_name,
                   e.emailidoffical as employee_email,
                   e.role as employee_role,
                   e.empcode as employee_code
            FROM empteamdtl td
            JOIN employees e ON td.empno_fk = e.empno_pk
            WHERE td.teamno_fk = ?
            ORDER BY td.au_entryat DESC
        `,
      [id]
    );

    const team = teamResult[0];
    team.members = membersResult;

    res.json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error("Get team error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching team",
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
        errors: errors.array(),
      });
    }

    const { teamcode, teamname, teamremarks, au_orgno } = req.body;

    const userId = req.user.id;

    // Create team
    const [insertResult] = await pool.execute(
      `INSERT INTO empteam (
                teamcode, teamname, teamremarks,
                au_orgno, au_entryempnoby, au_entryat
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `,
      [
        teamcode || null,
        teamname,
        teamremarks || null,
        au_orgno || null,
        userId,
      ]
    );

    // Fetch the newly inserted team by insertId
    const [newTeamRows] = await pool.execute(
      "SELECT * FROM empteam WHERE teamno_pk = ?",
      [insertResult.insertId]
    );
    const newTeam = newTeamRows[0] || {};

    res.status(201).json({
      success: true,
      message: "Team created successfully",
      data: newTeam,
    });
  } catch (error) {
    console.error("Create team error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating team",
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
    const [teamCheck] = await pool.execute(
      "SELECT * FROM empteam WHERE teamno_pk = ?",
      [id]
    );
    if (teamCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    // Build update query dynamically
    let updateFields = [];
    let values = [];

    const allowedFields = ["teamcode", "teamname", "teamremarks", "au_orgno"];

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
            UPDATE empteam SET ${updateFields.join(", ")}
            WHERE teamno_pk = ?
        `;

    await pool.execute(query, values);

    // Fetch updated team
    const [updatedTeam] = await pool.execute(
      "SELECT * FROM empteam WHERE teamno_pk = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Team updated successfully",
      data: updatedTeam[0],
    });
  } catch (error) {
    console.error("Update team error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating team",
    });
  }
};

/**
 * Delete team
 */
exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      "DELETE FROM empteam WHERE teamno_pk = ?",
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    res.json({
      success: true,
      message: "Team deleted successfully",
    });
  } catch (error) {
    console.error("Delete team error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting team",
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
    const [teamCheck] = await pool.execute(
      "SELECT teamcode FROM empteam WHERE teamno_pk = ?",
      [id]
    );
    if (teamCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const teamcode = teamCheck[0].teamcode;

    // Check if employee exists
    const [empCheck] = await pool.execute(
      "SELECT empno_pk FROM employees WHERE empno_pk = ?",
      [employee_id]
    );
    if (empCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Check if already a member
    const [memberCheck] = await pool.execute(
      "SELECT * FROM empteamdtl WHERE teamno_fk = ? AND empno_fk = ?",
      [id, employee_id]
    );

    if (memberCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Employee is already a member of this team",
      });
    }

    // Add member
    const [result] = await pool.execute(
      `INSERT INTO empteamdtl (
                teamno_fk, empno_fk,
                au_entryempnoby, au_entryat
            ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `,
      [id, employee_id, userId]
    );

    // Fetch the added member details
    const [memberDetails] = await pool.execute(
      `SELECT td.*, e.name as employee_name, e.emailidoffical as employee_email
             FROM empteamdtl td
             JOIN employees e ON td.empno_fk = e.empno_pk
             WHERE td.teamdtlno_pk = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Team member added successfully",
      data: memberDetails[0],
    });
  } catch (error) {
    console.error("Add team member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error adding team member",
    });
  }
};

/**
 * Remove member from team
 */
exports.removeTeamMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    const [result] = await pool.execute(
      "DELETE FROM empteamdtl WHERE teamno_fk = ? AND teamdtlno_pk = ?",
      [id, memberId]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    res.json({
      success: true,
      message: "Team member removed successfully",
    });
  } catch (error) {
    console.error("Remove team member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error removing team member",
    });
  }
};

/**
 * Get available employees (not in specific team)
 */
exports.getAvailableEmployees = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { search = "" } = req.query;

    let query = `
            SELECT e.empno_pk, e.empcode, e.name, e.emailidoffical, e.role, e.empstatus
            FROM employees e
            WHERE e.empstatus = 'Active'
            AND e.empno_pk NOT IN (
                SELECT empno_fk FROM empteamdtl WHERE teamno_fk = ?
            )
        `;

    const params = [teamId];

    if (search) {
      query += ` AND (LOWER(e.name) LIKE ? OR LOWER(e.emailidoffical) LIKE ? OR LOWER(e.empcode) LIKE ?)`;
      params.push(
        `%${search.toLowerCase()}%`,
        `%${search.toLowerCase()}%`,
        `%${search.toLowerCase()}%`
      );
    }

    query += ` ORDER BY e.name LIMIT 50`;

    const [result] = await pool.execute(query, params);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get available employees error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching available employees",
    });
  }
};
