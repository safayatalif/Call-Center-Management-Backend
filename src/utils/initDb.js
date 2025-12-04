const pool = require('../config/database');

/**
 * Complete Database Initialization
 * Creates ALL tables needed for the Call Center Management System
 */
async function initializeAllTables() {
  const connection = await pool.getConnection();

  try {
    console.log('\n🔧 Starting complete database initialization...\n');

    await connection.query('START TRANSACTION');

    // Drop existing tables in correct order (respecting foreign keys)
    console.log('📋 Dropping existing tables...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DROP TABLE IF EXISTS call_history');
    await connection.query('DROP TABLE IF EXISTS custassignment');
    await connection.query('DROP TABLE IF EXISTS customer');
    await connection.query('DROP TABLE IF EXISTS empteamdtl');
    await connection.query('DROP TABLE IF EXISTS empteam');
    await connection.query('DROP TABLE IF EXISTS calls');
    await connection.query('DROP TABLE IF EXISTS employees');
    await connection.query('DROP TABLE IF EXISTS projects');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Existing tables dropped\n');

    // 1. Create Projects table
    console.log('Creating Projects table...');
    await connection.query(`
            CREATE TABLE projects (
                projectno_pk INT AUTO_INCREMENT PRIMARY KEY,
                projectcode VARCHAR(50),
                projectname VARCHAR(255) NOT NULL,
                projectdescription TEXT,
                projectstatus VARCHAR(50) DEFAULT 'OPEN',
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INT,
                au_updateat TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
                au_udpatesession VARCHAR(255)
            )
        `);
    console.log('✅ Projects table created');

    // 2. Create Employees table
    console.log('Creating Employees table...');
    await connection.query(`
            CREATE TABLE employees (
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
                empstatus VARCHAR(50) DEFAULT 'Active',
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
                FOREIGN KEY (assigned_project_id) REFERENCES projects(projectno_pk) ON DELETE SET NULL
            )
        `);
    console.log('✅ Employees table created');

    // 3. Create Customer table
    console.log('Creating Customer table...');
    await connection.query(`
            CREATE TABLE customer (
                custno_pk INT AUTO_INCREMENT PRIMARY KEY,
                custcode VARCHAR(50),
                custname VARCHAR(255),
                custmobilenumber VARCHAR(50),
                custemailid VARCHAR(255),
                custaddress TEXT,
                custremarks TEXT,
                projectno_fk INT,
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INT,
                au_updateat TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
                au_udpatesession VARCHAR(255),
                FOREIGN KEY (projectno_fk) REFERENCES projects(projectno_pk) ON DELETE SET NULL
            )
        `);
    console.log('✅ Customer table created');

    // 4. Create Team table
    console.log('Creating Team tables...');
    await connection.query(`
            CREATE TABLE empteam (
                teamno_pk INT AUTO_INCREMENT PRIMARY KEY,
                teamcode VARCHAR(50),
                teamname VARCHAR(255),
                teamremarks TEXT,
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INT,
                au_updateat TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
                au_udpatesession VARCHAR(255)
            )
        `);

    await connection.query(`
            CREATE TABLE empteamdtl (
                teamdtlno_pk INT AUTO_INCREMENT PRIMARY KEY,
                teamno_fk INT,
                empno_fk INT,
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                FOREIGN KEY (teamno_fk) REFERENCES empteam(teamno_pk) ON DELETE CASCADE,
                FOREIGN KEY (empno_fk) REFERENCES employees(empno_pk) ON DELETE CASCADE
            )
        `);
    console.log('✅ Team tables created');

    // 5. Create Customer Assignment table
    console.log('Creating Customer Assignment table...');
    await connection.query(`
            CREATE TABLE custassignment (
                assignno_pk INT AUTO_INCREMENT PRIMARY KEY,
                custno_fk INT,
                empno_fk INT,
                projectno_fk INT,
                callstatus VARCHAR(50) DEFAULT 'Pending',
                callremarks TEXT,
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INT,
                au_updateat TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
                au_udpatesession VARCHAR(255),
                FOREIGN KEY (custno_fk) REFERENCES customer(custno_pk) ON DELETE CASCADE,
                FOREIGN KEY (empno_fk) REFERENCES employees(empno_pk) ON DELETE SET NULL,
                FOREIGN KEY (projectno_fk) REFERENCES projects(projectno_pk) ON DELETE SET NULL
            )
        `);
    console.log('✅ Customer Assignment table created');

    // 6. Create Call History table
    console.log('Creating Call History table...');
    await connection.query(`
            CREATE TABLE call_history (
                history_pk INT AUTO_INCREMENT PRIMARY KEY,
                custno_fk INT,
                empno_fk INT,
                projectno_fk INT,
                assignno_fk INT,
                callstatus VARCHAR(50),
                callremarks TEXT,
                interaction_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                FOREIGN KEY (custno_fk) REFERENCES customer(custno_pk) ON DELETE CASCADE,
                FOREIGN KEY (empno_fk) REFERENCES employees(empno_pk) ON DELETE SET NULL,
                FOREIGN KEY (projectno_fk) REFERENCES projects(projectno_pk) ON DELETE SET NULL,
                FOREIGN KEY (assignno_fk) REFERENCES custassignment(assignno_pk) ON DELETE SET NULL
            )
        `);
    console.log('✅ Call History table created');

    // 7. Create Calls table (for backward compatibility)
    console.log('Creating Calls table...');
    await connection.query(`
            CREATE TABLE calls (
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
                FOREIGN KEY (project_id) REFERENCES projects(projectno_pk) ON DELETE SET NULL
            )
        `);
    console.log('✅ Calls table created');

    // Create indexes for better performance
    console.log('\nCreating indexes...');
    await connection.query('CREATE INDEX idx_employees_email ON employees(emailidoffical)');
    await connection.query('CREATE INDEX idx_employees_username ON employees(username)');
    await connection.query('CREATE INDEX idx_employees_status ON employees(empstatus)');
    await connection.query('CREATE INDEX idx_customer_project ON customer(projectno_fk)');
    await connection.query('CREATE INDEX idx_assignment_status ON custassignment(callstatus)');
    await connection.query('CREATE INDEX idx_assignment_emp ON custassignment(empno_fk)');
    await connection.query('CREATE INDEX idx_callhistory_datetime ON call_history(interaction_datetime)');
    console.log('✅ Indexes created');

    await connection.query('COMMIT');

    console.log('\n✅ Complete database initialization successful!\n');
    console.log('📊 Tables created:');
    console.log('  - projects');
    console.log('  - employees');
    console.log('  - customer');
    console.log('  - empteam');
    console.log('  - empteamdtl');
    console.log('  - custassignment');
    console.log('  - call_history');
    console.log('  - calls');

  } catch (error) {
    await connection.query('ROLLBACK');
    console.error('\n❌ Database initialization failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeAllTables()
    .then(() => {
      console.log('\n🎉 Database is ready!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed to initialize database:', error);
      process.exit(1);
    });
}

module.exports = initializeAllTables;
