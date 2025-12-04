/**
 * Query helper utilities for MySQL
 * Provides PostgreSQL-like interface for MySQL queries
 */

/**
 * Execute a query and return results in PostgreSQL-like format
 * @param {Pool} pool - MySQL pool connection
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Object} - Result object with rows property
 */
async function query(pool, sql, params = []) {
    const [rows, fields] = await pool.execute(sql, params);
    return { rows, fields };
}

/**
 * Execute an INSERT query and return the inserted row
 * MySQL doesn't support RETURNING, so we need to fetch the inserted row
 * @param {Pool} pool - MySQL pool connection
 * @param {string} tableName - Table name
 * @param {Object} data - Data to insert
 * @param {string} primaryKey - Primary key column name (default: 'id')
 * @returns {Object} - Inserted row
 */
async function insertAndReturn(pool, tableName, data, primaryKey = 'id') {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    const [result] = await pool.execute(sql, values);

    // Fetch the inserted row
    const [rows] = await pool.execute(`SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`, [result.insertId]);
    return rows[0];
}

/**
 * Execute an UPDATE query and return the updated row
 * @param {Pool} pool - MySQL pool connection
 * @param {string} tableName - Table name
 * @param {Object} data - Data to update
 * @param {string} whereClause - WHERE clause (e.g., 'id = ?')
 * @param {Array} whereParams - Parameters for WHERE clause
 * @param {string} primaryKey - Primary key column name (default: 'id')
 * @returns {Object} - Updated row
 */
async function updateAndReturn(pool, tableName, data, whereClause, whereParams, primaryKey = 'id') {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');

    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
    await pool.execute(sql, [...values, ...whereParams]);

    // Fetch the updated row
    const [rows] = await pool.execute(`SELECT * FROM ${tableName} WHERE ${whereClause}`, whereParams);
    return rows[0];
}

/**
 * Execute a DELETE query and return the deleted row ID
 * @param {Pool} pool - MySQL pool connection
 * @param {string} tableName - Table name
 * @param {string} whereClause - WHERE clause (e.g., 'id = ?')
 * @param {Array} whereParams - Parameters for WHERE clause
 * @returns {Object} - Deleted row ID
 */
async function deleteAndReturn(pool, tableName, whereClause, whereParams) {
    // First fetch the row to return
    const [rows] = await pool.execute(`SELECT * FROM ${tableName} WHERE ${whereClause}`, whereParams);
    const deletedRow = rows[0];

    // Then delete it
    const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
    await pool.execute(sql, whereParams);

    return deletedRow;
}

module.exports = {
    query,
    insertAndReturn,
    updateAndReturn,
    deleteAndReturn
};
