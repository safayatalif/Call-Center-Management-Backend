const pool = require("../config/database");

/**
 * Get employees and customers by project
 */
exports.getProjectData = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get employees assigned to this project (via Team or Direct Assignment)
    const employeesQuery = `
            SELECT DISTINCT e.empno_pk, e.empcode, e.name, e.emailidoffical, e.role
            FROM employees e
            LEFT JOIN empteamdtl etd ON e.empno_pk = etd.empno_fk
            LEFT JOIN projects p ON p.projectdefault_teamno_fk = etd.teamno_fk
            WHERE (p.projectno_pk = ? OR e.assigned_project_id = ?) 
            AND e.empstatus = 'Active'
            ORDER BY e.name
        `;

    // Get customers assigned to this project
    const customersQuery = `
            SELECT c.custno_pk, c.custcode, c.custname, c.custmobilenumber, 
                   c.custemailid as custemail,
                   CASE 
                       WHEN ca.assignno_pk IS NOT NULL THEN true 
                       ELSE false 
                   END as is_assigned,
                   ca.empno_fk as assigned_to_empno,
                   e.name as assigned_to_name
            FROM customer c
            LEFT JOIN custassignment ca ON c.custno_pk = ca.custno_fk
            LEFT JOIN employees e ON ca.empno_fk = e.empno_pk
            WHERE c.projectno_fk = ?
            ORDER BY c.custname
        `;

    const [employeesResult, customersResult] = await Promise.all([
      pool.execute(employeesQuery, [projectId, projectId]),
      pool.execute(customersQuery, [projectId]),
    ]);

    res.json({
      success: true,
      data: {
        employees: employeesResult[0],
        customers: customersResult[0],
      },
    });
  } catch (error) {
    console.error("Get project data error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching project data",
      error: error.message,
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
                   c.custemailid as custemail
            FROM customer c
            LEFT JOIN custassignment ca ON c.custno_pk = ca.custno_fk
            WHERE c.projectno_fk = ? AND ca.assignno_pk IS NULL
            ORDER BY c.custname
        `;

    const [result] = await pool.execute(query, [projectId]);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get unassigned customers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching unassigned customers",
      error: error.message,
    });
  }
};

/**
 * Assign multiple customers to an employee
 */
exports.assignCustomers = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { empno_pk, customer_ids, calltargetdate, callpriority } = req.body;

    const userId = req.user.id;

    await connection.query("START TRANSACTION");

    const assignments = [];

    for (const custno_fk of customer_ids) {
      // Get customer mobile number
      const [customerResult] = await connection.execute(
        "SELECT custmobilenumber FROM customer WHERE custno_pk = ?",
        [custno_fk]
      );

      const custmobilenumber = customerResult[0]?.custmobilenumber || null;

      // Create assignment
      const [result] = await connection.execute(
        `INSERT INTO custassignment (
                    assigndate, calltargetdate, custno_fk, custmobilenumber,
                    empno_fk, callpriority, callstatus, au_entryempnoby, au_entryat
                ) VALUES (CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, 'Pending', ?, CURRENT_TIMESTAMP)
                `,
        [
          calltargetdate || null,
          custno_fk,
          custmobilenumber,
          empno_pk,
          callpriority || "Low",
          userId,
        ]
      );

      assignments.push({ assignno_pk: result.insertId });
    }

    await connection.query("COMMIT");

    res.status(201).json({
      success: true,
      message: `Successfully assigned ${assignments.length} customer(s)`,
      data: assignments,
    });
  } catch (error) {
    await connection.query("ROLLBACK");
    console.error("Assign customers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error assigning customers",
      error: error.message,
    });
  } finally {
    connection.release();
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
      callpriority,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    let queryParams = [];

    if (empno_pk) {
      whereConditions.push(`ca.empno_fk = ?`);
      queryParams.push(empno_pk);
    }

    if (callstatus) {
      whereConditions.push(`ca.callstatus = ?`);
      queryParams.push(callstatus);
    }

    if (callpriority) {
      whereConditions.push(`ca.callpriority = ?`);
      queryParams.push(callpriority);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM custassignment ca ${whereClause}`;
    const [countResult] = await pool.query(countQuery, queryParams);
    const totalAssignments =
      countResult && countResult[0] ? parseInt(countResult[0].count) : 0;

    // Get paginated results
    const dataQuery = `
            SELECT ca.*,
                   c.custname, c.custcode, c.custemailid as custemail,
                   e.name as employee_name, e.empcode as employee_code,
                   p.projectname, p.projectcode
            FROM custassignment ca
            INNER JOIN customer c ON ca.custno_fk = c.custno_pk
            INNER JOIN employees e ON ca.empno_fk = e.empno_pk
            LEFT JOIN projects p ON c.projectno_fk = p.projectno_pk
            ${whereClause}
            ORDER BY ca.assigndate DESC
            LIMIT ? OFFSET ?
        `;

    const [result] = await pool.query(dataQuery, [
      ...queryParams,
      parseInt(limit),
      offset,
    ]);

    res.json({
      success: true,
      data: result,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalAssignments / parseInt(limit)),
        totalAssignments: totalAssignments,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching assignments",
      error: error.message,
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

    const allowedFields = [
      "calltargetdate",
      "calleddatetime",
      "callpriority",
      "callstatus",
      "callstatus_text",
      "followupdate",
      "count_call",
      "count_message",
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    updateFields.push(`au_updateempnoby = ?`);
    values.push(userId);

    updateFields.push(`au_updateat = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
            UPDATE custassignment SET ${updateFields.join(", ")}
            WHERE assignno_pk = ?
        `;

    const [result] = await pool.execute(query, values);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Fetch updated assignment
    const [updatedAssignment] = await pool.execute(
      "SELECT * FROM custassignment WHERE assignno_pk = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Assignment updated successfully",
      data: updatedAssignment[0],
    });
  } catch (error) {
    console.error("Update assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating assignment",
      error: error.message,
    });
  }
};

/**
 * Get my assigned customers (for agents)
 */
exports.getMyCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      callstatus = "",
      callpriority = "",
      projectId = "",
      startDate = "",
      endDate = "",
    } = req.query;

    const empno_pk = req.user.id;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [`ca.empno_fk = ?`];
    let queryParams = [empno_pk];
    let paramCount = 2;

    // Search filter
    if (search) {
      whereConditions.push(
        "(LOWER(c.custname) LIKE ? OR LOWER(c.custmobilenumber) LIKE ?)"
      );
      queryParams.push(
        `%${search.toLowerCase()}%`,
        `%${search.toLowerCase()}%`
      );
    }

    // Status filter
    if (callstatus) {
      whereConditions.push("ca.callstatus = ?");
      queryParams.push(callstatus);
    }

    // Priority filter
    if (callpriority) {
      whereConditions.push("ca.callpriority = ?");
      queryParams.push(callpriority);
    }

    // Project filter
    if (projectId) {
      whereConditions.push("c.projectno_fk = ?");
      queryParams.push(projectId);
    }

    // Date range filter (target date)
    if (startDate) {
      whereConditions.push("ca.calltargetdate >= ?");
      queryParams.push(startDate);
    }
    if (endDate) {
      whereConditions.push("ca.calltargetdate <= ?");
      queryParams.push(endDate);
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    // Get total count
    const countQuery = `
            SELECT COUNT(*) as count
            FROM custassignment ca
            INNER JOIN customer c ON ca.custno_fk = c.custno_pk
            ${whereClause}
        `;
    const [countResult] = await pool.query(countQuery, queryParams);
    const totalCustomers =
      countResult && countResult[0] ? parseInt(countResult[0].count) : 0;

    // Get paginated results
    const dataQuery = `
            SELECT ca.*,
                   c.custname, c.custcode, c.custemailid as custemail,
                   c.custaddress, c.custremarks,
                   p.projectname, p.projectcode
            FROM custassignment ca
            INNER JOIN customer c ON ca.custno_fk = c.custno_pk
            LEFT JOIN projects p ON c.projectno_fk = p.projectno_pk
            ${whereClause}
            ORDER BY 
                CASE ca.callpriority
                    WHEN 'High' THEN 1
                    WHEN 'Medium' THEN 2
                    WHEN 'Low' THEN 3
                END,
                ca.calltargetdate ASC,
                ca.assigndate DESC
            LIMIT ? OFFSET ?
        `;

    const [result] = await pool.query(dataQuery, [
      ...queryParams,
      parseInt(limit),
      offset,
    ]);

    res.json({
      success: true,
      data: result,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCustomers / parseInt(limit)),
        totalCustomers: totalCustomers,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get my customers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching customers",
      error: error.message,
    });
  }
};

/**
 * Update customer interaction (call, SMS, WhatsApp)
 */
exports.updateCustomerInteraction = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const {
      interaction_type,
      calleddatetime,
      callstatus,
      callstatus_text,
      followupdate,
      count_call,
      count_message,
      call_duration,
    } = req.body;

    const userId = req.user.id;

    await connection.query("START TRANSACTION");

    // Check if assignment belongs to this employee
    const [checkQuery] = await connection.execute(
      "SELECT * FROM custassignment WHERE assignno_pk = ? AND empno_fk = ?",
      [id, userId]
    );

    if (checkQuery.length === 0) {
      await connection.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this assignment",
      });
    }

    const assignment = checkQuery[0];

    // Update custassignment
    const [updateResult] = await connection.execute(
      `UPDATE custassignment SET
                calleddatetime = COALESCE(?, calleddatetime),
                callstatus = COALESCE(?, callstatus),
                callstatus_text = COALESCE(?, callstatus_text),
                followupdate = COALESCE(?, followupdate),
                count_call = COALESCE(?, count_call),
                count_message = COALESCE(?, count_message),
                au_updateempnoby = ?,
                au_updateat = CURRENT_TIMESTAMP
            WHERE assignno_pk = ?
            `,
      [
        calleddatetime === undefined ? null : calleddatetime,
        callstatus === undefined ? null : callstatus,
        callstatus_text === undefined ? null : callstatus_text,
        followupdate === undefined ? null : followupdate,
        count_call === undefined ? null : count_call,
        count_message === undefined ? null : count_message,
        userId,
        id,
      ]
    );

    // Insert into call_history
    await connection.execute(
      `INSERT INTO call_history (
                assignno_fk, custno_fk, empno_fk, interaction_type,
                interaction_datetime, callstatus, callstatus_text,
                followupdate, call_duration, au_entryempnoby, au_entryat
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        id,
        assignment.custno_fk,
        userId,
        interaction_type || "call",
        calleddatetime || new Date(),
        callstatus === undefined ? null : callstatus,
        callstatus_text === undefined ? null : callstatus_text,
        followupdate === undefined ? null : followupdate,
        call_duration === undefined ? null : call_duration,
        userId,
      ]
    );

    await connection.query("COMMIT");

    res.json({
      success: true,
      message: "Customer interaction updated successfully",
      data: { affectedRows: updateResult.affectedRows },
    });
  } catch (error) {
    await connection.query("ROLLBACK");
    console.error("Update customer interaction error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating customer interaction",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Get call history for a customer assignment
 */
exports.getCallHistory = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;

    // Check if assignment belongs to this employee (for agents) or allow all for admin/manager
    const [checkQuery] = await pool.execute(
      "SELECT * FROM custassignment WHERE assignno_pk = ?",
      [assignmentId]
    );

    if (checkQuery.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Get call history
    const historyQuery = `
            SELECT ch.*,
                   e.name as employee_name,
                   e.empcode as employee_code
            FROM call_history ch
            LEFT JOIN employees e ON ch.empno_fk = e.empno_pk
            WHERE ch.assignno_fk = ?
            ORDER BY ch.interaction_datetime DESC
        `;

    const [result] = await pool.execute(historyQuery, [assignmentId]);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get call history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching call history",
      error: error.message,
    });
  }
};

/**
 * Delete assignment
 */
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      "DELETE FROM custassignment WHERE assignno_pk = ?",
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    console.error("Delete assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting assignment",
      error: error.message,
    });
  }
};
