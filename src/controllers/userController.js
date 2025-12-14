const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

/**
 * Get all users with filtering and pagination
 */
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      role = "",
      status = "",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    // Search filter (name or email)
    if (search) {
      whereConditions.push("(LOWER(name) LIKE ? OR LOWER(email) LIKE ?)");
      queryParams.push(
        `%${search.toLowerCase()}%`,
        `%${search.toLowerCase()}%`
      );
    }

    // Role filter
    if (role) {
      whereConditions.push("role = ?");
      queryParams.push(role);
    }

    // Status filter
    if (status) {
      whereConditions.push("status = ?");
      queryParams.push(status);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`;
    const [countResult] = await pool.execute(countQuery, queryParams);
    const totalUsers =
      countResult && countResult[0] ? parseInt(countResult[0].count) : 0;

    // Get paginated results
    const dataQuery = `
            SELECT id, name, email, role, capacity, personal_numbers, 
                   official_numbers, social_ids, address, remarks, status, 
                   restricted_data_privilege, created_at, updated_at
            FROM users 
            ${whereClause}
            ORDER BY created_at DESC
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
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
        totalUsers: totalUsers,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching users",
    });
  }
};

/**
 * Get single user by ID
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      `
            SELECT id, name, email, role, capacity, personal_numbers, 
                   official_numbers, social_ids, address, remarks, status, 
                   restricted_data_privilege, created_at, updated_at
            FROM users 
            WHERE id = ?
        `,
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user",
    });
  }
};

/**
 * Create new user
 */
exports.createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      name,
      email,
      password,
      role,
      capacity,
      personal_numbers,
      official_numbers,
      social_ids,
      address,
      remarks,
      status,
      restricted_data_privilege,
    } = req.body;

    // Check if user already exists
    const [existingUser] = await pool.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const [result] = await pool.execute(
      `INSERT INTO users (
                name, email, password_hash, role, capacity, 
                personal_numbers, official_numbers, social_ids, 
                address, remarks, status, restricted_data_privilege
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
            `,
      [
        name,
        email,
        passwordHash,
        role || "AGENT",
        capacity || 0,
        personal_numbers || null,
        official_numbers || null,
        social_ids ? JSON.stringify(social_ids) : null,
        address || null,
        remarks || null,
        status || "active",
        restricted_data_privilege || false,
      ]
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result[0],
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating user",
    });
  }
};

/**
 * Update user
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      password,
      role,
      capacity,
      personal_numbers,
      official_numbers,
      social_ids,
      address,
      remarks,
      status,
      restricted_data_privilege,
    } = req.body;

    // Check if user exists
    const [userCheck] = await pool.execute("SELECT * FROM users WHERE id = ?", [
      id,
    ]);
    if (userCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If email is being changed, check if new email already exists
    if (email && email !== userCheck[0][0].email) {
      const [emailCheck] = await pool.execute(
        "SELECT * FROM users WHERE email = ? AND id != ?",
        [email, id]
      );
      if (emailCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email already in use by another user",
        });
      }
    }

    // Build update query dynamically
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      updateFields.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }
    if (role !== undefined) {
      updateFields.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (capacity !== undefined) {
      updateFields.push(`capacity = $${paramCount++}`);
      values.push(capacity);
    }
    if (personal_numbers !== undefined) {
      updateFields.push(`personal_numbers = $${paramCount++}`);
      values.push(personal_numbers);
    }
    if (official_numbers !== undefined) {
      updateFields.push(`official_numbers = $${paramCount++}`);
      values.push(official_numbers);
    }
    if (social_ids !== undefined) {
      updateFields.push(`social_ids = $${paramCount++}`);
      values.push(social_ids ? JSON.stringify(social_ids) : null);
    }
    if (address !== undefined) {
      updateFields.push(`address = $${paramCount++}`);
      values.push(address);
    }
    if (remarks !== undefined) {
      updateFields.push(`remarks = $${paramCount++}`);
      values.push(remarks);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (restricted_data_privilege !== undefined) {
      updateFields.push(`restricted_data_privilege = $${paramCount++}`);
      values.push(restricted_data_privilege);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
            UPDATE users SET ${updateFields.join(", ")}
            WHERE id = $${paramCount}
            `;

    const [result] = await pool.execute(query, values);

    res.json({
      success: true,
      message: "User updated successfully",
      data: result[0],
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating user",
    });
  }
};

/**
 * Delete user
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute("DELETE FROM users WHERE id = ?", [id]);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting user",
    });
  }
};

/**
 * Inactivate user (soft delete)
 */
exports.inactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      `UPDATE users SET status = 'inactive', updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? 
             `,
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User inactivated successfully",
      data: result[0],
    });
  } catch (error) {
    console.error("Inactivate user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error inactivating user",
    });
  }
};
