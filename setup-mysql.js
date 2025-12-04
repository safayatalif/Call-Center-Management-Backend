#!/usr/bin/env node

/**
 * MySQL Setup and Admin Creation Script
 * This script will:
 * 1. Test MySQL connection
 * 2. Create database if needed
 * 3. Initialize tables
 * 4. Create admin user
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConnection() {
    log('\n📡 Testing MySQL connection...', 'cyan');

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD
        });

        log('✅ MySQL connection successful!', 'green');
        await connection.end();
        return true;
    } catch (error) {
        log('❌ MySQL connection failed!', 'red');
        log(`Error: ${error.message}`, 'red');

        log('\n💡 Please check:', 'yellow');
        log('1. MySQL is installed and running', 'yellow');
        log('2. Your .env file has correct credentials:', 'yellow');
        log('   DB_HOST=localhost', 'yellow');
        log('   DB_PORT=3306', 'yellow');
        log('   DB_USER=root', 'yellow');
        log('   DB_PASSWORD=your_password', 'yellow');

        return false;
    }
}

async function createDatabase() {
    log('\n🗄️  Creating database...', 'cyan');

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD
        });

        const dbName = process.env.DB_NAME || 'call_center_db';

        // Check if database exists
        const [databases] = await connection.query(
            `SHOW DATABASES LIKE '${dbName}'`
        );

        if (databases.length > 0) {
            log(`✅ Database '${dbName}' already exists`, 'green');
        } else {
            await connection.query(
                `CREATE DATABASE ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
            );
            log(`✅ Database '${dbName}' created successfully!`, 'green');
        }

        await connection.end();
        return true;
    } catch (error) {
        log('❌ Failed to create database!', 'red');
        log(`Error: ${error.message}`, 'red');
        return false;
    }
}

async function initializeTables() {
    log('\n📋 Initializing database tables...', 'cyan');

    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            database: process.env.DB_NAME || 'call_center_db',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            waitForConnections: true,
            connectionLimit: 10
        });

        const connection = await pool.getConnection();

        // Drop existing tables
        await connection.query('DROP TABLE IF EXISTS calls');
        await connection.query('DROP TABLE IF EXISTS employees');
        await connection.query('DROP TABLE IF EXISTS projects');

        // Create Projects table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                projectno_pk INT,
                projectcode VARCHAR(50),
                projectname VARCHAR(255) NOT NULL,
                projectdescription TEXT,
                projectstatus VARCHAR(50) DEFAULT 'OPEN',
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INT,
                au_updateat TIMESTAMP NULL,
                au_udpatesession VARCHAR(255)
            )
        `);
        log('  ✓ Projects table created', 'green');

        // Create Employees table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS employees (
                empno_pk INT AUTO_INCREMENT PRIMARY KEY,
                empcode VARCHAR(50),
                joindate TIMESTAMP NULL,
                name VARCHAR(255),
                role VARCHAR(50),
                capacity INT,
                officialmobilenum VARCHAR(50),
                personalmobilenum VARCHAR(50),
                socialmediaidofficial TEXT,
                emailidoffical VARCHAR(255) UNIQUE,
                address TEXT,
                empremarks TEXT,
                empstatus VARCHAR(50),
                restricteddataprivilege CHAR(1),
                app_userind VARCHAR(50),
                username VARCHAR(255) UNIQUE,
                entrypass VARCHAR(255),
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP NULL,
                au_entrysession VARCHAR(255),
                au_updateempnoby INT,
                au_updateat TIMESTAMP NULL,
                au_udpatesession VARCHAR(255),
                assigned_project_id INT,
                FOREIGN KEY (assigned_project_id) REFERENCES projects(id) ON DELETE SET NULL
            )
        `);
        log('  ✓ Employees table created', 'green');

        // Create Calls table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS calls (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id INT,
                project_id INT,
                customer_name VARCHAR(255),
                customer_phone VARCHAR(50),
                customer_email VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                notes TEXT,
                call_duration INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(empno_pk) ON DELETE SET NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
            )
        `);
        log('  ✓ Calls table created', 'green');

        // Create indexes
        await connection.query('CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(emailidoffical)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username)');
        log('  ✓ Indexes created', 'green');

        connection.release();
        await pool.end();

        log('✅ All tables initialized successfully!', 'green');
        return true;
    } catch (error) {
        log('❌ Failed to initialize tables!', 'red');
        log(`Error: ${error.message}`, 'red');
        return false;
    }
}

async function createAdminUser() {
    log('\n👤 Creating admin user...', 'cyan');

    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            database: process.env.DB_NAME || 'call_center_db',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            waitForConnections: true,
            connectionLimit: 10
        });

        const connection = await pool.getConnection();

        // Admin credentials
        const adminData = {
            empcode: 'ADMIN001',
            name: 'System Administrator',
            emailidoffical: 'admin@callcenter.com',
            username: 'admin',
            password: 'admin123',
            role: 'ADMIN',
            capacity: 100,
            officialmobilenum: '+880 1712-345678',
            empstatus: 'Active',
            restricteddataprivilege: 'N'
        };

        // Check if admin exists
        const [existing] = await connection.execute(
            'SELECT * FROM employees WHERE username = ? OR emailidoffical = ?',
            [adminData.username, adminData.emailidoffical]
        );

        if (existing.length > 0) {
            log('⚠️  Admin user already exists!', 'yellow');
            log('\n📧 Email: admin@callcenter.com', 'cyan');
            log('👤 Username: admin', 'cyan');
            log('🔑 Password: (use existing password)', 'cyan');
        } else {
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(adminData.password, salt);

            // Create admin
            await connection.execute(
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

            log('✅ Admin user created successfully!', 'green');
            log('\n╔════════════════════════════════════════╗', 'bright');
            log('║     ADMIN LOGIN CREDENTIALS            ║', 'bright');
            log('╠════════════════════════════════════════╣', 'bright');
            log('║  📧 Email:    admin@callcenter.com     ║', 'cyan');
            log('║  👤 Username: admin                    ║', 'cyan');
            log('║  🔑 Password: admin123                 ║', 'cyan');
            log('╚════════════════════════════════════════╝', 'bright');
            log('\n⚠️  IMPORTANT: Change password after first login!', 'yellow');
        }

        connection.release();
        await pool.end();
        return true;
    } catch (error) {
        log('❌ Failed to create admin user!', 'red');
        log(`Error: ${error.message}`, 'red');
        return false;
    }
}

async function main() {
    log('\n╔════════════════════════════════════════════════════╗', 'bright');
    log('║  MySQL Setup & Admin Creation Script              ║', 'bright');
    log('╚════════════════════════════════════════════════════╝', 'bright');

    // Step 1: Test connection
    const connected = await testConnection();
    if (!connected) {
        log('\n❌ Setup failed! Please fix MySQL connection first.', 'red');
        process.exit(1);
    }

    // Step 2: Create database
    const dbCreated = await createDatabase();
    if (!dbCreated) {
        log('\n❌ Setup failed! Could not create database.', 'red');
        process.exit(1);
    }

    // Step 3: Initialize tables
    const tablesCreated = await initializeTables();
    if (!tablesCreated) {
        log('\n❌ Setup failed! Could not create tables.', 'red');
        process.exit(1);
    }

    // Step 4: Create admin user
    const adminCreated = await createAdminUser();
    if (!adminCreated) {
        log('\n❌ Setup failed! Could not create admin user.', 'red');
        process.exit(1);
    }

    log('\n╔════════════════════════════════════════════════════╗', 'green');
    log('║  ✅ Setup completed successfully!                  ║', 'green');
    log('╚════════════════════════════════════════════════════╝', 'green');

    log('\n📋 Next steps:', 'cyan');
    log('1. Start the backend server: npm run dev', 'cyan');
    log('2. Test login with admin credentials', 'cyan');
    log('3. Change admin password after first login', 'cyan');

    process.exit(0);
}

// Run the script
main().catch(error => {
    log('\n❌ Unexpected error:', 'red');
    log(error.message, 'red');
    process.exit(1);
});
