const pool = require('../config/database');

/**
 * Create customer table (MySQL version)
 */
async function createCustomerTable() {
    const connection = await pool.getConnection();

    try {
        console.log('🔧 Creating customer table...');

        await connection.query('START TRANSACTION');

        // Create customer table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS customer (
                custno_pk INT AUTO_INCREMENT PRIMARY KEY,
                custcode VARCHAR(50),
                projectno_fk INT,
                countrycode VARCHAR(10) DEFAULT '+880',
                custmobilenumber VARCHAR(50),
                custemail VARCHAR(255),
                custname VARCHAR(255),
                facebook_link VARCHAR(500),
                linkedin_link VARCHAR(500),
                other_link VARCHAR(500),
                call_link_type VARCHAR(255),
                text_note TEXT,
                contact_type VARCHAR(50),
                custarea VARCHAR(255),
                custfeedback TEXT,
                agentfeedback TEXT,
                never_callind CHAR(1),
                never_callind_message TEXT,
                custgender VARCHAR(20),
                custbirthdate VARCHAR(50),
                custtype VARCHAR(50) DEFAULT 'Undefined',
                cust_labeling VARCHAR(255),
                au_orgno INT,
                au_entryempnoby INT,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INT,
                au_updateat TIMESTAMP NULL,
                au_udpatesession VARCHAR(255),
                FOREIGN KEY (projectno_fk) REFERENCES projects(projectno_pk) ON DELETE SET NULL
            )
        `);
        console.log('✅ customer table created');

        // Create indexes (one at a time for MySQL)
        await connection.query('CREATE INDEX IF NOT EXISTS idx_customer_code ON customer(custcode)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_customer_project ON customer(projectno_fk)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_customer_mobile ON customer(custmobilenumber)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_customer_email ON customer(custemail)');
        await connection.query('CREATE INDEX IF NOT EXISTS idx_customer_type ON customer(custtype)');
        console.log('✅ Indexes created');

        await connection.query('COMMIT');
        console.log('✅ Customer table created successfully!');

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error('❌ Failed to create customer table:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Run if called directly
if (require.main === module) {
    createCustomerTable()
        .then(() => {
            console.log('Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Failed:', error);
            process.exit(1);
        });
}

module.exports = createCustomerTable;
