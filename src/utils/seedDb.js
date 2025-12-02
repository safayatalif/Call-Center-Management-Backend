const pool = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Seed database with demo data
 */
async function seedDatabase() {
    const client = await pool.connect();

    try {
        console.log('🌱 Starting database seeding...');

        await client.query('BEGIN');

        // Create admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['Admin User', 'admin@callcenter.com', adminPassword, 'ADMIN']);
        console.log('✅ Admin user created');

        // Create sample projects
        const projects = [
            { name: 'প্রজেক্ট আলফা', description: 'Customer satisfaction survey project' },
            { name: 'প্রজেক্ট বেটা', description: 'Product feedback collection' },
            { name: 'প্রজেক্ট গামা', description: 'Sales follow-up campaign' },
        ];

        for (const project of projects) {
            await client.query(`
        INSERT INTO projects (name, description, status)
        VALUES ($1, $2, 'active')
        ON CONFLICT DO NOTHING
      `, [project.name, project.description]);
        }
        console.log('✅ Sample projects created');

        // Get project IDs
        const projectsResult = await client.query('SELECT id FROM projects LIMIT 3');
        const projectIds = projectsResult.rows.map(row => row.id);

        // Create sample agents
        const agents = [
            { name: 'জন ডো', email: 'john@callcenter.com', phone: '+880 1712-111111' },
            { name: 'জেন স্মিথ', email: 'jane@callcenter.com', phone: '+880 1712-222222' },
            { name: 'মাইক জনসন', email: 'mike@callcenter.com', phone: '+880 1712-333333' },
            { name: 'সারা উইলিয়ামস', email: 'sarah@callcenter.com', phone: '+880 1712-444444' },
        ];

        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            const projectId = projectIds[i % projectIds.length];
            await client.query(`
        INSERT INTO agents (name, email, phone, assigned_project_id, status)
        VALUES ($1, $2, $3, $4, 'active')
        ON CONFLICT (email) DO NOTHING
      `, [agent.name, agent.email, agent.phone, projectId]);
        }
        console.log('✅ Sample agents created');

        // Get agent IDs
        const agentsResult = await client.query('SELECT id FROM agents LIMIT 4');
        const agentIds = agentsResult.rows.map(row => row.id);

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

            await client.query(`
        INSERT INTO calls (agent_id, project_id, customer_name, customer_phone, customer_email, status, notes, call_duration)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [agentId, projectId, customer.name, customer.phone, customer.email, status, note, duration]);
        }
        console.log('✅ Sample calls created');

        await client.query('COMMIT');
        console.log('✅ Database seeding completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database seeding failed:', error);
        throw error;
    } finally {
        client.release();
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
