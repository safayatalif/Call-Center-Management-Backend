const pool = require('../config/database');

/**
 * Update projects table with new schema
 */
async function updateProjectsTable() {
    const client = await pool.connect();

    try {
        console.log('🔧 Updating projects table...');

        await client.query('BEGIN');

        // Drop existing projects table
        await client.query('DROP TABLE IF EXISTS projects CASCADE');
        console.log('✅ Old projects table dropped');

        // Create new projects table with complete schema
        await client.query(`
            CREATE TABLE IF NOT EXISTS projects (
                projectno_pk SERIAL PRIMARY KEY,
                projectcode VARCHAR(50),
                projectname VARCHAR(255) NOT NULL,
                projectstartdate TIMESTAMP,
                projectenddate TIMESTAMP,
                projectstatus VARCHAR(50) DEFAULT 'OPEN',
                projectdefault_teamno_fk INTEGER REFERENCES empteam(teamno_pk) ON DELETE SET NULL,
                projectrestrictedind CHAR(1) DEFAULT 'N',
                projectcompanyname VARCHAR(255),
                projectcontacts TEXT,
                au_orgno INTEGER,
                au_entryempnoby INTEGER,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INTEGER,
                au_updateat TIMESTAMP,
                au_udpatesession VARCHAR(255)
            )
        `);
        console.log('✅ New projects table created');

        // Update calls table to reference new projects primary key
        await client.query(`
            ALTER TABLE calls 
            DROP CONSTRAINT IF EXISTS calls_project_id_fkey
        `);

        await client.query(`
            ALTER TABLE calls 
            ADD CONSTRAINT calls_project_id_fkey 
            FOREIGN KEY (project_id) REFERENCES projects(projectno_pk) ON DELETE SET NULL
        `);
        console.log('✅ Calls table foreign key updated');

        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(projectcode);
            CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(projectstatus);
            CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(projectdefault_teamno_fk);
        `);
        console.log('✅ Indexes created');

        await client.query('COMMIT');
        console.log('✅ Projects table updated successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to update projects table:', error);
        throw error;
    } finally {
        client.release();
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
