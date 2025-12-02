const pool = require('../config/database');

/**
 * Initialize database tables
 * Creates all required tables for the call center management system
 */
async function initializeDatabase() {
  const client = await pool.connect();

  try {
    console.log('🔧 Starting database initialization...');

    // Start transaction
    await client.query('BEGIN');

    // Drop existing tables to ensure clean state for new schema
    await client.query(`
            DROP TABLE IF EXISTS calls CASCADE;
            DROP TABLE IF EXISTS agents CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
            DROP TABLE IF EXISTS employees CASCADE;
            DROP TABLE IF EXISTS projects CASCADE;
        `);
    console.log('✅ Existing tables dropped');

    // Create Projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Projects table created/verified');

    // Create Employees table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        empno_pk SERIAL PRIMARY KEY,
        empcode VARCHAR(50),
        joindate TIMESTAMP,
        name VARCHAR(255),
        role VARCHAR(50),
        capacity INTEGER,
        officialmobilenum VARCHAR(50),
        personalmobilenum VARCHAR(50),
        socialmediaidofficial TEXT,
        emailidoffical VARCHAR(255) UNIQUE,
        address TEXT,
        empremarks TEXT,
        empstatus VARCHAR(50),
        restricteddataprivilege CHAR(1),
        app_userind VARCHAR(50),
        username VARCHAR(255) UNIQUE,
        entrypass VARCHAR(255),
        au_orgno INTEGER,
        au_entryempnoby INTEGER,
        au_entryat TIMESTAMP,
        au_entrysession VARCHAR(255),
        au_updateempnoby INTEGER,
        au_updateat TIMESTAMP,
        au_udpatesession VARCHAR(255),
        assigned_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Employees table created/verified');

    // Create Calls table
    await client.query(`
      CREATE TABLE IF NOT EXISTS calls (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(empno_pk) ON DELETE SET NULL,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        customer_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        call_duration INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Calls table created/verified');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(emailidoffical);
      CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);
      CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
      CREATE INDEX IF NOT EXISTS idx_calls_employee_id ON calls(employee_id);
    `);
    console.log('✅ Indexes created/verified');

    // Commit transaction
    await client.query('COMMIT');

    console.log('✅ Database initialization completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database ready!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    });
}

module.exports = initializeDatabase;
