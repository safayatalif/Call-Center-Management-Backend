const pool = require('../config/database');

/**
 * Create customer table
 */
async function createCustomerTable() {
    const client = await pool.connect();

    try {
        console.log('🔧 Creating customer table...');

        await client.query('BEGIN');

        // Create customer table
        await client.query(`
            CREATE TABLE IF NOT EXISTS customer (
                custno_pk SERIAL PRIMARY KEY,
                custcode VARCHAR(50),
                projectno_fk INTEGER REFERENCES projects(projectno_pk) ON DELETE SET NULL,
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
                au_orgno INTEGER,
                au_entryempnoby INTEGER,
                au_entryat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                au_entrysession VARCHAR(255),
                au_updateempnoby INTEGER,
                au_updateat TIMESTAMP,
                au_udpatesession VARCHAR(255)
            )
        `);
        console.log('✅ customer table created');

        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_customer_code ON customer(custcode);
            CREATE INDEX IF NOT EXISTS idx_customer_project ON customer(projectno_fk);
            CREATE INDEX IF NOT EXISTS idx_customer_mobile ON customer(custmobilenumber);
            CREATE INDEX IF NOT EXISTS idx_customer_email ON customer(custemail);
            CREATE INDEX IF NOT EXISTS idx_customer_type ON customer(custtype);
        `);
        console.log('✅ Indexes created');

        await client.query('COMMIT');
        console.log('✅ Customer table created successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to create customer table:', error);
        throw error;
    } finally {
        client.release();
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
