const pool = require('../config/database');

/**
 * Create call history table to track all interactions (MySQL version)
 */
async function createCallHistoryTable() {
    const connection = await pool.getConnection();

    try {
        console.log('🔧 Creating call_history table...');

        await connection.query('START TRANSACTION');

        // Create call_history table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS call_history (
                history_pk INT AUTO_INCREMENT PRIMARY KEY,
                assignno_fk INT,
                custno_fk INT,
                empno_fk INT,
                interaction_type VARCHAR(20),
                interaction_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                callstatus VARCHAR(50),
                callstatus_text TEXT,
                followupdate TIMESTAMP NULL,
                call_duration INT,
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (assignno_fk) REFERENCES custassignment(assignno_pk) ON DELETE CASCADE,
                FOREIGN KEY (custno_fk) REFERENCES customer(custno_pk) ON DELETE CASCADE,
                FOREIGN KEY (empno_fk) REFERENCES employees(empno_pk) ON DELETE CASCADE
            )
        `);
        console.log('✅ call_history table created');

        // Create indexes (one at a time for MySQL)
        await connection.query('CREATE INDEX IF NOT EXISTS idx_callhistory_assignment ON call_history(assignno_fk)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_callhistory_customer ON call_history(custno_fk)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_callhistory_employee ON call_history(empno_fk)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_callhistory_datetime ON call_history(interaction_datetime)');
        console.log('✅ Indexes created');

        await connection.query('COMMIT');
        console.log('✅ call_history table created successfully!');

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error('❌ Failed to create call_history table:', error);
        throw error;
    } finally {
        connection.release();
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
