const pool = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Seed database with demo data (MySQL version)
 */
async function seedDatabase() {
    const connection = await pool.getConnection();

    try {
        console.log('🌱 Starting database seeding...');

        await connection.query('START TRANSACTION');

        // Note: This seeder is for legacy 'users' table if it exists
        // The main system uses 'employees' table

        // Create admin user (if users table exists)
        try {
            const adminPassword = await bcrypt.hash('admin123', 10);
            await connection.execute(`
                INSERT IGNORE INTO users (name, email, password_hash, role)
                VALUES (?, ?, ?, ?)
            `, ['Admin User', 'admin@callcenter.com', adminPassword, 'ADMIN']);
            console.log('✅ Admin user created (if users table exists)');
        } catch (err) {
            console.log('ℹ️  Users table may not exist, skipping...');
        }

        // Create sample projects
        const projects = [
            { name: 'প্রজেক্ট আলফা', description: 'Customer satisfaction survey project' },
            { name: 'প্রজেক্ট বেটা', description: 'Product feedback collection' },
            { name: 'প্রজেক্ট গামা', description: 'Sales follow-up campaign' },
        ];

        for (const project of projects) {
            await connection.execute(`
                INSERT INTO projects (projectname, projectdescription, projectstatus)
                VALUES (?, ?, 'OPEN')
                ON DUPLICATE KEY UPDATE projectname = projectname
            `, [project.name, project.description]);
        }
        console.log('✅ Sample projects created');

        // Get project IDs
        const [projectsResult] = await connection.execute('SELECT projectno_pk FROM projects LIMIT 3');
        const projectIds = projectsResult.map(row => row.projectno_pk);

        if (projectIds.length === 0) {
            console.log('⚠️  No projects found, skipping agents and calls creation');
            await connection.query('COMMIT');
            return;
        }

        // Create sample agents (employees)
        const agents = [
            { name: 'জন ডো', email: 'john@callcenter.com', phone: '+880 1712-111111' },
            { name: 'জেন স্মিথ', email: 'jane@callcenter.com', phone: '+880 1712-222222' },
            { name: 'মাইক জনসন', email: 'mike@callcenter.com', phone: '+880 1712-333333' },
            { name: 'সারা উইলিয়ামস', email: 'sarah@callcenter.com', phone: '+880 1712-444444' },
        ];

        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            const projectId = projectIds[i % projectIds.length];
            await connection.execute(`
                INSERT INTO employees (name, emailidoffical, officialmobilenum, assigned_project_id, empstatus, role)
                VALUES (?, ?, ?, ?, 'Active', 'AGENT')
                ON DUPLICATE KEY UPDATE name = name
            `, [agent.name, agent.email, agent.phone, projectId]);
        }
        console.log('✅ Sample agents created');

        // Get agent IDs
        const [agentsResult] = await connection.execute('SELECT empno_pk FROM employees WHERE role = "AGENT" LIMIT 4');
        const agentIds = agentsResult.map(row => row.empno_pk);

        if (agentIds.length === 0) {
            console.log('⚠️  No agents found, skipping calls creation');
            await connection.query('COMMIT');
            return;
        }

        // Create sample calls
        const customers = [
            { name: 'রহিম আহমেদ', phone: '+880 1712-345678', email: 'rahim@example.com' },
            { name: 'করিম খান', phone: '+880 1812-345678', email: 'karim@example.com' },
            { name: 'ফাতিমা বেগম', phone: '+880 1912-345678', email: 'fatima@example.com' },
            { name: 'আলী হোসেন', phone: '+880 1612-345678', email: 'ali@example.com' },
            { name: 'নাজমা আক্তার', phone: '+880 1512-345678', email: 'nazma@example.com' },
        ];

        const statuses = ['completed', 'pending', 'in_progress', 'failed'];
        const notes = [
            'Customer was satisfied with the service',
            'Need to follow up tomorrow',
            'Customer requested a callback',
            'No answer, will try again',
            'Successfully completed the survey',
        ];

        for (let i = 0; i < 20; i++) {
            const customer = customers[i % customers.length];
            const agentId = agentIds[i % agentIds.length];
            const projectId = projectIds[i % projectIds.length];
            const status = statuses[i % statuses.length];
            const note = notes[i % notes.length];
            const duration = status === 'completed' ? Math.floor(Math.random() * 600) + 60 : null;

            await connection.execute(`
                INSERT INTO calls (employee_id, project_id, customer_name, customer_phone, customer_email, status, notes, call_duration)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [agentId, projectId, customer.name, customer.phone, customer.email, status, note, duration]);
        }
        console.log('✅ Sample calls created');

        await connection.query('COMMIT');
        console.log('✅ Database seeding completed successfully!');

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error('❌ Database seeding failed:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Run seeding if called directly
if (require.main === module) {
    seedDatabase()
        .then(() => {
            console.log('Database seeded!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Failed to seed database:', error);
            process.exit(1);
        });
}

module.exports = seedDatabase;
