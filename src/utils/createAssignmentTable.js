const pool = require('../config/database');

/**
 * Create custassignment table
 */
async function createAssignmentTable() {
    const client = await pool.connect();

    try {
        console.log('🔧 Creating custassignment table...');

        await client.query('BEGIN');

        // Create custassignment table
        await client.query(`
            CREATE TABLE IF NOT EXISTS custassignment (
                assignno_pk SERIAL PRIMARY KEY,
                assigndate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                calltargetdate TIMESTAMP,
                custno_fk INTEGER REFERENCES customer(custno_pk) ON DELETE CASCADE,
                custmobilenumber VARCHAR(50),
                empno_pk INTEGER REFERENCES employees(empno_pk) ON DELETE CASCADE,
                calleddatetime TIMESTAMP,
                callpriority VARCHAR(20) DEFAULT 'Low',
                callstatus VARCHAR(50) DEFAULT 'Pending',
                callstatus_text TEXT,
                followupdate TIMESTAMP,
                count_call INTEGER DEFAULT 0,
                count_message INTEGER DEFAULT 0,
                au_orgno INTEGER,
                au_entryempnoby INTEGER,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INTEGER,
                au_updateat TIMESTAMP,
                au_udpatesession VARCHAR(255)
            )
        `);
        console.log('✅ custassignment table created');

        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_custassignment_customer ON custassignment(custno_fk);
            CREATE INDEX IF NOT EXISTS idx_custassignment_employee ON custassignment(empno_pk);
            CREATE INDEX IF NOT EXISTS idx_custassignment_status ON custassignment(callstatus);
            CREATE INDEX IF NOT EXISTS idx_custassignment_priority ON custassignment(callpriority);
            CREATE INDEX IF NOT EXISTS idx_custassignment_targetdate ON custassignment(calltargetdate);
        `);
        console.log('✅ Indexes created');

        await client.query('COMMIT');
        console.log('✅ custassignment table created successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to create custassignment table:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run if called directly
if (require.main === module) {
    createAssignmentTable()
        .then(() => {
            console.log('Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Failed:', error);
            process.exit(1);
        });
}

module.exports = createAssignmentTable;
