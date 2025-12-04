#!/usr/bin/env node

/**
 * Environment File Checker
 * Checks if .env is configured for MySQL
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

console.log('\n🔍 Checking .env configuration...\n');

if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('📝 Please create a .env file in the backend directory');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

let hasIssues = false;
const issues = [];
const fixes = [];

// Check DB_PORT
const portLine = lines.find(line => line.startsWith('DB_PORT='));
if (portLine) {
    const port = portLine.split('=')[1]?.trim();
    if (port === '5432') {
        hasIssues = true;
        issues.push('❌ DB_PORT is set to 5432 (PostgreSQL)');
        fixes.push('✏️  Change DB_PORT=5432 to DB_PORT=3306');
    } else if (port === '3306') {
        console.log('✅ DB_PORT is correct (3306)');
    } else {
        console.log(`⚠️  DB_PORT is set to ${port} (expected 3306)`);
    }
} else {
    hasIssues = true;
    issues.push('❌ DB_PORT is not set');
    fixes.push('✏️  Add: DB_PORT=3306');
}

// Check DB_USER
const userLine = lines.find(line => line.startsWith('DB_USER='));
if (userLine) {
    const user = userLine.split('=')[1]?.trim();
    if (user === 'postgres') {
        hasIssues = true;
        issues.push('❌ DB_USER is set to postgres (PostgreSQL)');
        fixes.push('✏️  Change DB_USER=postgres to DB_USER=root');
    } else if (user === 'root') {
        console.log('✅ DB_USER is correct (root)');
    } else {
        console.log(`ℹ️  DB_USER is set to ${user}`);
    }
} else {
    hasIssues = true;
    issues.push('❌ DB_USER is not set');
    fixes.push('✏️  Add: DB_USER=root');
}

// Check DB_NAME
const dbLine = lines.find(line => line.startsWith('DB_NAME='));
if (dbLine) {
    const dbName = dbLine.split('=')[1]?.trim();
    console.log(`✅ DB_NAME is set to ${dbName}`);
} else {
    hasIssues = true;
    issues.push('❌ DB_NAME is not set');
    fixes.push('✏️  Add: DB_NAME=call_center_db');
}

// Check DB_PASSWORD
const passLine = lines.find(line => line.startsWith('DB_PASSWORD='));
if (passLine) {
    console.log('✅ DB_PASSWORD is set');
} else {
    console.log('⚠️  DB_PASSWORD is not set (might be needed)');
}

console.log('\n' + '='.repeat(50));

if (hasIssues) {
    console.log('\n🚨 ISSUES FOUND:\n');
    issues.forEach(issue => console.log('  ' + issue));

    console.log('\n🔧 HOW TO FIX:\n');
    fixes.forEach(fix => console.log('  ' + fix));

    console.log('\n📝 QUICK FIX:');
    console.log('  1. Open backend/.env in your editor');
    console.log('  2. Make the changes listed above');
    console.log('  3. Save the file');
    console.log('  4. Run: node setup-mysql.js');
    console.log('  5. Restart server: npm run dev\n');

    process.exit(1);
} else {
    console.log('\n✅ .env is configured correctly for MySQL!\n');
    console.log('📋 Next steps:');
    console.log('  1. Make sure MySQL is running');
    console.log('  2. Run: node setup-mysql.js');
    console.log('  3. Start server: npm run dev\n');

    process.exit(0);
}
