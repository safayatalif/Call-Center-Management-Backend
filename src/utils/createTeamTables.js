const pool = require('../config/database');

/**
 * Create team management tables (MySQL version)
 */
async function createTeamTables() {
    const connection = await pool.getConnection();

    try {
        console.log('🔧 Creating team management tables...');

        await connection.query('START TRANSACTION');

        // Create empteam table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS empteam (
                teamno_pk INT AUTO_INCREMENT PRIMARY KEY,
                teamcode VARCHAR(50),
                teamname VARCHAR(255),
                teamdescription TEXT,
                teamtype VARCHAR(100),
                teamlead_empno_fk INT,
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INT,
                au_updateat TIMESTAMP NULL,
                au_udpatesession VARCHAR(255),
                FOREIGN KEY (teamlead_empno_fk) REFERENCES employees(empno_pk) ON DELETE SET NULL
            )
        `);
        console.log('✅ empteam table created');

        // Create empteamdtl table (team members)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS empteamdtl (
                teamdtlno_pk INT AUTO_INCREMENT PRIMARY KEY,
                teamno_fk INT,
                teamcode VARCHAR(50),
                team_empno_pk INT,
                remarks TEXT,
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INT,
                au_updateat TIMESTAMP NULL,
                au_udpatesession VARCHAR(255),
                FOREIGN KEY (teamno_fk) REFERENCES empteam(teamno_pk) ON DELETE CASCADE,
                FOREIGN KEY (team_empno_pk) REFERENCES employees(empno_pk) ON DELETE CASCADE
            )
        `);
        console.log('✅ empteamdtl table created');

        // Create indexes (one at a time for MySQL)
        await connection.query('CREATE INDEX IF NOT EXISTS idx_empteam_teamcode ON empteam(teamcode)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_empteam_teamlead ON empteam(teamlead_empno_fk)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_empteamdtl_teamno ON empteamdtl(teamno_fk)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_empteamdtl_empno ON empteamdtl(team_empno_pk)');
        console.log('✅ Indexes created');

        await connection.query('COMMIT');
        console.log('✅ Team tables created successfully!');

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error('❌ Failed to create team tables:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Run if called directly
if (require.main === module) {
    createTeamTables()
        .then(() => {
            console.log('Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Failed:', error);
            process.exit(1);
        });
}

module.exports = createTeamTables;
