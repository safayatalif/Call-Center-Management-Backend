const pool = require('../config/database');

/**
 * Update projects table with new schema (MySQL version)
 */
async function updateProjectsTable() {
    const connection = await pool.getConnection();

    try {
        console.log('🔧 Updating projects table...');

        await connection.query('START TRANSACTION');

        // Disable foreign key checks temporarily
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Drop existing projects table
        await connection.query('DROP TABLE IF EXISTS projects');
        console.log('✅ Old projects table dropped');

        // Create new projects table with complete schema
        await connection.query(`
            CREATE TABLE IF NOT EXISTS projects (
                projectno_pk INT AUTO_INCREMENT PRIMARY KEY,
                projectcode VARCHAR(50),
                projectname VARCHAR(255) NOT NULL,
                projectstartdate TIMESTAMP NULL,
                projectenddate TIMESTAMP NULL,
                projectstatus VARCHAR(50) DEFAULT 'OPEN',
                projectdefault_teamno_fk INT,
                projectrestrictedind CHAR(1) DEFAULT 'N',
                projectcompanyname VARCHAR(255),
                projectcontacts TEXT,
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INT,
                au_updateat TIMESTAMP NULL,
                au_udpatesession VARCHAR(255),
                FOREIGN KEY (projectdefault_teamno_fk) REFERENCES empteam(teamno_pk) ON DELETE SET NULL
            )
        `);
        console.log('✅ New projects table created');

        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        // Create indexes (one at a time for MySQL)
        await connection.query('CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(projectcode)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(projectstatus)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(projectdefault_teamno_fk)');
        console.log('✅ Indexes created');

        await connection.query('COMMIT');
        console.log('✅ Projects table updated successfully!');

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error('❌ Failed to update projects table:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Run if called directly
if (require.main === module) {
    updateProjectsTable()
        .then(() => {
            console.log('Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Failed:', error);
            process.exit(1);
        });
}

module.exports = updateProjectsTable;
