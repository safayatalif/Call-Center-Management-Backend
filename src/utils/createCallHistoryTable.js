const pool = require('../config/database');

/**
 * Create call history table to track all interactions
 */
async function createCallHistoryTable() {
    const client = await pool.connect();

    try {
        console.log('🔧 Creating call_history table...');

        await client.query('BEGIN');

        // Create call_history table
        await client.query(`
            CREATE TABLE IF NOT EXISTS call_history (
                history_pk SERIAL PRIMARY KEY,
                assignno_fk INTEGER REFERENCES custassignment(assignno_pk) ON DELETE CASCADE,
                custno_fk INTEGER REFERENCES customer(custno_pk) ON DELETE CASCADE,
                empno_fk INTEGER REFERENCES employees(empno_pk) ON DELETE CASCADE,
                interaction_type VARCHAR(20),
                interaction_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                callstatus VARCHAR(50),
                callstatus_text TEXT,
                followupdate TIMESTAMP,
                call_duration INTEGER,
                au_orgno INTEGER,
                au_entryempnoby INTEGER,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ call_history table created');

        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_callhistory_assignment ON call_history(assignno_fk);
            CREATE INDEX IF NOT EXISTS idx_callhistory_customer ON call_history(custno_fk);
            CREATE INDEX IF NOT EXISTS idx_callhistory_employee ON call_history(empno_fk);
            CREATE INDEX IF NOT EXISTS idx_callhistory_datetime ON call_history(interaction_datetime);
        `);
        console.log('✅ Indexes created');

        await client.query('COMMIT');
        console.log('✅ call_history table created successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to create call_history table:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run if called directly
if (require.main === module) {
    createCallHistoryTable()
        .then(() => {
            console.log('Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Failed:', error);
            process.exit(1);
        });
}

module.exports = createCallHistoryTable;
