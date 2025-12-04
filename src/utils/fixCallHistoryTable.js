const pool = require('../config/database');

async function fixCallHistoryTable() {
    const connection = await pool.getConnection();
    try {
        console.log('🔧 Fixing call_history table schema...');

        await connection.query('START TRANSACTION');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Drop existing table
        await connection.query('DROP TABLE IF EXISTS call_history');

        // Recreate with correct schema
        await connection.query(`
            CREATE TABLE call_history (
                history_pk INT AUTO_INCREMENT PRIMARY KEY,
                assignno_fk INT,
                custno_fk INT,
                empno_fk INT,
                interaction_type VARCHAR(50) DEFAULT 'call',
                interaction_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                callstatus VARCHAR(50),
                callstatus_text TEXT,
                followupdate TIMESTAMP NULL,
                call_duration INT,
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                FOREIGN KEY (assignno_fk) REFERENCES custassignment(assignno_pk) ON DELETE CASCADE,
                FOREIGN KEY (custno_fk) REFERENCES customer(custno_pk) ON DELETE CASCADE,
                FOREIGN KEY (empno_fk) REFERENCES employees(empno_pk) ON DELETE CASCADE
            )
        `);

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        await connection.query('COMMIT');
        console.log('✅ call_history table fixed successfully');

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error('❌ Error fixing call_history table:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

fixCallHistoryTable();
