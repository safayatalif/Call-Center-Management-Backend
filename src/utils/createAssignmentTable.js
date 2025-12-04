const pool = require('../config/database');

/**
 * Create custassignment table (MySQL version)
 */
async function createAssignmentTable() {
    const connection = await pool.getConnection();

    try {
        console.log('🔧 Creating custassignment table...');

        await connection.query('START TRANSACTION');

        // Create custassignment table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS custassignment (
                assignno_pk INT AUTO_INCREMENT PRIMARY KEY,
                assigndate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                calltargetdate TIMESTAMP NULL,
                custno_fk INT,
                custmobilenumber VARCHAR(50),
                empno_pk INT,
                calleddatetime TIMESTAMP NULL,
                callpriority VARCHAR(20) DEFAULT 'Low',
                callstatus VARCHAR(50) DEFAULT 'Pending',
                callstatus_text TEXT,
                followupdate TIMESTAMP NULL,
                count_call INT DEFAULT 0,
                count_message INT DEFAULT 0,
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INT,
                au_updateat TIMESTAMP NULL,
                au_udpatesession VARCHAR(255),
                FOREIGN KEY (custno_fk) REFERENCES customer(custno_pk) ON DELETE CASCADE,
                FOREIGN KEY (empno_pk) REFERENCES employees(empno_pk) ON DELETE CASCADE
            )
        `);
        console.log('✅ custassignment table created');

        // Create indexes (one at a time for MySQL)
        await connection.query('CREATE INDEX IF NOT EXISTS idx_custassignment_customer ON custassignment(custno_fk)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_custassignment_employee ON custassignment(empno_pk)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_custassignment_status ON custassignment(callstatus)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_custassignment_priority ON custassignment(callpriority)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_custassignment_targetdate ON custassignment(calltargetdate)');
        console.log('✅ Indexes created');

        await connection.query('COMMIT');
        console.log('✅ custassignment table created successfully!');

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error('❌ Failed to create custassignment table:', error);
        throw error;
    } finally {
        connection.release();
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
