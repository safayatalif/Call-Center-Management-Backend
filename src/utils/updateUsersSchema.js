const pool = require('../config/database');

async function updateUsersSchema() {
    const connection = await pool.getConnection();

    try {
        console.log('🔧 Updating users table schema...');

        await connection.query('START TRANSACTION');

        // Note: MySQL doesn't support ADD COLUMN IF NOT EXISTS in the same way
        // We'll need to check if columns exist first or use a different approach

        // For simplicity, we'll try to add columns and ignore errors if they exist
        const columnsToAdd = [
            { name: 'capacity', type: 'INT DEFAULT 0' },
            { name: 'personal_numbers', type: 'TEXT' },
            { name: 'official_numbers', type: 'TEXT' },
            { name: 'social_ids', type: 'JSON' },
            { name: 'address', type: 'TEXT' },
            { name: 'remarks', type: 'TEXT' },
            { name: 'status', type: 'VARCHAR(50) DEFAULT "active"' },
            { name: 'restricted_data_privilege', type: 'BOOLEAN DEFAULT false' }
        ];

        for (const column of columnsToAdd) {
            try {
                await connection.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
                console.log(`✅ Added column: ${column.name}`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`ℹ️  Column ${column.name} already exists, skipping...`);
                } else {
                    throw err;
                }
            }
        }

        console.log('✅ Users table schema updated');

        await connection.query('COMMIT');
        console.log('✅ Schema update completed successfully!');
    } catch (error) {
        await connection.query('ROLLBACK');
        console.error('❌ Schema update failed:', error);
        throw error;
    } finally {
        connection.release();
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
