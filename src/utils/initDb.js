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

        // Create Users table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'agent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Users table created/verified');

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

        // Create Agents table
        await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        assigned_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Agents table created/verified');

        // Create Calls table
        await client.query(`
      CREATE TABLE IF NOT EXISTS calls (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
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
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
      CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
      CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id);
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
