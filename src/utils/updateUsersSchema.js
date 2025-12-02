const pool = require('../config/database');

async function updateUsersSchema() {
    const client = await pool.connect();

    try {
        console.log('🔧 Updating users table schema...');

        await client.query('BEGIN');

        // Add new columns to users table
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS personal_numbers TEXT,
            ADD COLUMN IF NOT EXISTS official_numbers TEXT,
            ADD COLUMN IF NOT EXISTS social_ids JSONB,
            ADD COLUMN IF NOT EXISTS address TEXT,
            ADD COLUMN IF NOT EXISTS remarks TEXT,
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
            ADD COLUMN IF NOT EXISTS restricted_data_privilege BOOLEAN DEFAULT false;
        `);

        console.log('✅ Added new columns to users table');

        // Update role column to support new roles if needed
        console.log('✅ Users table schema updated');

        await client.query('COMMIT');
        console.log('✅ Schema update completed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Schema update failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run if called directly
if (require.main === module) {
    updateUsersSchema()
        .then(() => {
            console.log('Schema update complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Failed to update schema:', error);
            process.exit(1);
        });
}

module.exports = updateUsersSchema;
