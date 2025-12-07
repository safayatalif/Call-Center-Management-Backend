const pool = require("../config/database");
const { validationResult } = require("express-validator");

/**
 * Get all customers with filtering and pagination
 */
exports.getAllCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      projectId = "",
      custtype = "",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    // Search filter
    if (search) {
      whereConditions.push(
        "(LOWER(c.custname) LIKE ? OR LOWER(c.custcode) LIKE ? OR LOWER(c.custmobilenumber) LIKE ? OR LOWER(c.custemail) LIKE ?)"
      );
      queryParams.push(
        `%${search.toLowerCase()}%`,
        `%${search.toLowerCase()}%`,
        `%${search.toLowerCase()}%`,
        `%${search.toLowerCase()}%`
      );
    }

    // Project filter
    if (projectId) {
      whereConditions.push("c.projectno_fk = ?");
      queryParams.push(projectId);
    }

    // Customer type filter
    if (custtype) {
      whereConditions.push("c.custtype = ?");
      queryParams.push(custtype);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM customer c ${whereClause}`;
    const [countResult] = await pool.query(countQuery, queryParams);
    const totalCustomers =
      countResult && countResult[0] ? parseInt(countResult[0].count) : 0;

    // Get paginated results with project info
    const dataQuery = `
            SELECT c.*,
                   p.projectname as project_name,
                   p.projectcode as project_code
            FROM customer c
            LEFT JOIN projects p ON c.projectno_fk = p.projectno_pk
            ${whereClause}
            ORDER BY c.au_entryat DESC
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
    console.error("Get customers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching customers",
      error: error.message,
    });
  }
};

/**
 * Get single customer by ID
 */
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      `
            SELECT c.*,
                   p.projectname as project_name,
                   p.projectcode as project_code
            FROM customer c
            LEFT JOIN projects p ON c.projectno_fk = p.projectno_pk
            WHERE c.custno_pk = ?
        `,
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching customer",
      error: error.message,
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
        errors: errors.array(),
      });
    }

    const {
      custcode,
      projectno_fk,
      custmobilenumber,
      custemail,
      custname,
      custaddress,
      custremarks,
      au_orgno,
    } = req.body;

    const userId = req.user.id;

    // Create customer
    const [result] = await pool.execute(
      `INSERT INTO customer (
                custcode, projectno_fk, custmobilenumber, custemailid,
                custname, custaddress, custremarks,
                au_orgno, au_entryempnoby, au_entryat
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `,
      [
        custcode || null,
        projectno_fk || null,
        custmobilenumber || null,
        custemail || null,
        custname || null,
        custaddress || null,
        custremarks || null,
        au_orgno || null,
        userId,
      ]
    );

    // Fetch the created customer
    const [newCustomer] = await pool.execute(
      "SELECT * FROM customer WHERE custno_pk = ?",
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: newCustomer[0],
    });
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating customer",
      error: error.message,
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
    const [customerCheck] = await pool.execute(
      "SELECT * FROM customer WHERE custno_pk = ?",
      [id]
    );
    if (customerCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Build update query dynamically
    let updateFields = [];
    let values = [];

    const allowedFields = [
      "custcode",
      "projectno_fk",
      "custmobilenumber",
      "custemailid",
      "custname",
      "custaddress",
      "custremarks",
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
            UPDATE customer SET ${updateFields.join(", ")}
            WHERE custno_pk = ?
        `;

    await pool.execute(query, values);

    // Fetch updated customer
    const [updatedCustomer] = await pool.execute(
      "SELECT * FROM customer WHERE custno_pk = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Customer updated successfully",
      data: updatedCustomer[0],
    });
  } catch (error) {
    console.error("Update customer error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating customer",
      error: error.message,
    });
  }
};

/**
 * Delete customer
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      "DELETE FROM customer WHERE custno_pk = ?",
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting customer",
      error: error.message,
    });
  }
};
