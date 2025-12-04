const pool = require('../config/database');

async function fixAssignmentTable() {
    const connection = await pool.getConnection();
    try {
        console.log('🔧 Fixing custassignment table schema...');

        await connection.query('START TRANSACTION');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Drop existing table
        await connection.query('DROP TABLE IF EXISTS custassignment');

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        // Recreate with correct schema
        await connection.query(`
            CREATE TABLE custassignment (
                assignno_pk INT AUTO_INCREMENT PRIMARY KEY,
                assigndate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                calltargetdate TIMESTAMP NULL,
                custno_fk INT,
                custmobilenumber VARCHAR(50),
                empno_fk INT,
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
                FOREIGN KEY (empno_fk) REFERENCES employees(empno_pk) ON DELETE CASCADE
            )
        `);

        await connection.query('COMMIT');
        console.log('✅ custassignment table fixed successfully');

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error('❌ Error fixing custassignment table:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

fixAssignmentTable();
