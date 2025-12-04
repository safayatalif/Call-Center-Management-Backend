#!/usr/bin/env node

/**
 * Restore PostgreSQL from backups
 * This script restores all .pg.backup files
 */

const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../controllers');

console.log('\n🔄 Restoring PostgreSQL configuration from backups...\n');

// Find all .pg.backup files
const files = fs.readdirSync(controllersDir);
const backupFiles = files.filter(f => f.endsWith('.pg.backup'));

if (backupFiles.length === 0) {
    console.log('⚠️  No backup files found!');
    console.log('The controllers may already be in PostgreSQL format.');
    process.exit(0);
}

let restored = 0;

backupFiles.forEach(backupFile => {
    const originalFile = backupFile.replace('.pg.backup', '');
    const backupPath = path.join(controllersDir, backupFile);
    const originalPath = path.join(controllersDir, originalFile);

    try {
        // Copy backup to original
        const content = fs.readFileSync(backupPath, 'utf8');
        fs.writeFileSync(originalPath, content, 'utf8');
        console.log(`✅ Restored: ${originalFile}`);
        restored++;
    } catch (error) {
        console.error(`❌ Failed to restore ${originalFile}:`, error.message);
    }
});

console.log(`\n✅ Restored ${restored} controller files`);
console.log('\n📋 Next steps:');
console.log('1. Update .env to use PostgreSQL settings');
console.log('2. Run: npm run init-db');
console.log('3. Run: node src/utils/createAdmin.js');
console.log('4. Start server: npm run dev\n');
