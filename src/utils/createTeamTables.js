const pool = require('../config/database');

/**
 * Create team management tables
 */
async function createTeamTables() {
    const client = await pool.connect();

    try {
        console.log('🔧 Creating team management tables...');

        await client.query('BEGIN');

        // Create empteam table
        await client.query(`
            CREATE TABLE IF NOT EXISTS empteam (
                teamno_pk SERIAL PRIMARY KEY,
                teamcode VARCHAR(50),
                teamname VARCHAR(255),
                teamdescription TEXT,
                teamtype VARCHAR(100),
                teamlead_empno_fk INTEGER REFERENCES employees(empno_pk) ON DELETE SET NULL,
                au_orgno INTEGER,
                au_entryempnoby INTEGER,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INTEGER,
                au_updateat TIMESTAMP,
                au_udpatesession VARCHAR(255)
            )
        `);
        console.log('✅ empteam table created');

        // Create empteamdtl table (team members)
        await client.query(`
            CREATE TABLE IF NOT EXISTS empteamdtl (
                teamdtlno_pk SERIAL PRIMARY KEY,
                teamno_fk INTEGER REFERENCES empteam(teamno_pk) ON DELETE CASCADE,
                teamcode VARCHAR(50),
                team_empno_pk INTEGER REFERENCES employees(empno_pk) ON DELETE CASCADE,
                remarks TEXT,
                au_orgno INTEGER,
                au_entryempnoby INTEGER,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INTEGER,
                au_updateat TIMESTAMP,
                au_udpatesession VARCHAR(255)
            )
        `);
        console.log('✅ empteamdtl table created');

        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_empteam_teamcode ON empteam(teamcode);
            CREATE INDEX IF NOT EXISTS idx_empteam_teamlead ON empteam(teamlead_empno_fk);
            CREATE INDEX IF NOT EXISTS idx_empteamdtl_teamno ON empteamdtl(teamno_fk);
            CREATE INDEX IF NOT EXISTS idx_empteamdtl_empno ON empteamdtl(team_empno_pk);
        `);
        console.log('✅ Indexes created');

        await client.query('COMMIT');
        console.log('✅ Team tables created successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to create team tables:', error);
        throw error;
    } finally {
        client.release();
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
