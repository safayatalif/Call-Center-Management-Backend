const pool = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Create default admin user
 */
async function createAdminUser() {
    const connection = await pool.getConnection();

    try {
        console.log('🔧 Creating admin user...');

        // Admin credentials
        const adminData = {
            empcode: 'ADMIN001',
            name: 'Admin User',
            emailidoffical: 'admin@callcenter.com',
            username: 'admin',
            password: 'admin123', // Change this password after first login!
            role: 'ADMIN',
            capacity: 100,
            officialmobilenum: '+880 1712-345678',
            empstatus: 'Active',
            restricteddataprivilege: 'N'
        };

        // Check if admin already exists
        const [existingAdmin] = await connection.execute(
            'SELECT * FROM employees WHERE username = ? OR emailidoffical = ?',
            [adminData.username, adminData.emailidoffical]
        );

        if (existingAdmin.length > 0) {
            console.log('⚠️  Admin user already exists!');
            console.log('\n📧 Email:', adminData.emailidoffical);
            console.log('👤 Username:', adminData.username);
            console.log('🔑 Password: (existing password)');
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminData.password, salt);

        // Create admin user
        const [result] = await connection.execute(
            `INSERT INTO employees (
                empcode, joindate, name, role, capacity,
                officialmobilenum, emailidoffical, empstatus,
                restricteddataprivilege, username, entrypass, au_entryat
            ) VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
                adminData.empcode,
                adminData.name,
                adminData.role,
                adminData.capacity,
                adminData.officialmobilenum,
                adminData.emailidoffical,
                adminData.empstatus,
                adminData.restricteddataprivilege,
                adminData.username,
                passwordHash
            ]
        );

        console.log('✅ Admin user created successfully!');
        console.log('\n═══════════════════════════════════════');
        console.log('📋 ADMIN LOGIN CREDENTIALS');
        console.log('═══════════════════════════════════════');
        console.log('📧 Email:    ', adminData.emailidoffical);
        console.log('👤 Username: ', adminData.username);
        console.log('🔑 Password: ', adminData.password);
        console.log('═══════════════════════════════════════');
        console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');

    } catch (error) {
        console.error('❌ Failed to create admin user:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Run if called directly
if (require.main === module) {
    createAdminUser()
        .then(() => {
            console.log('Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Failed:', error);
            process.exit(1);
        });
}

module.exports = createAdminUser;
