const pool = require('../config/database');

async function addTeamToProjects() {
    const connection = await pool.getConnection();
    try {
        console.log('🔧 Adding projectdefault_teamno_fk to projects table...');

        await connection.query('START TRANSACTION');

        // Check if column exists
        const [columns] = await connection.execute(`
            SHOW COLUMNS FROM projects LIKE 'projectdefault_teamno_fk'
        `);

        if (columns.length === 0) {
            // Add column
            await connection.query(`
                ALTER TABLE projects 
                ADD COLUMN projectdefault_teamno_fk INT,
                ADD FOREIGN KEY (projectdefault_teamno_fk) REFERENCES empteam(teamno_pk) ON DELETE SET NULL
            `);
            console.log('✅ Column projectdefault_teamno_fk added successfully');
        } else {
            console.log('ℹ️ Column projectdefault_teamno_fk already exists');
        }

        await connection.query('COMMIT');

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error('❌ Error adding column:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

addTeamToProjects();
