#!/usr/bin/env node

/**
 * Comprehensive PostgreSQL to MySQL Migration Script
 * Converts all controller files from PostgreSQL syntax to MySQL syntax
 */

const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../controllers');

// Files to convert (excluding authController which is already done)
const files = [
    'assignmentController.js',
    'customerController.js',
    'dashboardController.js',
    'employeeController.js',
    'projectController.js',
    'reportsController.js',
    'teamController.js',
    'userController.js'
];

function convertPostgresToMySQL(content) {
    let converted = content;

    // Step 1: Convert pool.query to pool.execute with proper destructuring
    // Match: const varName = await pool.query(
    converted = converted.replace(
        /const\s+(\w+)\s*=\s*await\s+pool\.query\(/g,
        'const [$1] = await pool.execute('
    );

    // Step 2: Convert Promise.all with pool.query
    // Match: pool.query( inside Promise.all
    converted = converted.replace(
        /pool\.query\(/g,
        'pool.execute('
    );

    // Step 3: Replace PostgreSQL placeholders ($1, $2, etc.) with MySQL placeholders (?)
    // This is tricky because we need to replace them in order
    // We'll use a more sophisticated approach

    // Find all query strings and replace $N with ?
    converted = converted.replace(/(['"`])([^'"`]*?\$\d+[^'"`]*?)\1/g, (match, quote, queryStr) => {
        // Replace $1, $2, etc. with ? in the query string
        const replacedQuery = queryStr.replace(/\$\d+/g, '?');
        return quote + replacedQuery + quote;
    });

    // Step 4: Handle .rows references
    // After destructuring, we don't need .rows anymore
    // But we need to be careful with Promise.all results

    // For Promise.all results, we need to access [0] instead of .rows
    // Pattern: variableName.rows[0] -> variableName[0][0]
    converted = converted.replace(/(\w+)\.rows\[(\d+)\]/g, '$1[$2][0]');

    // Pattern: variableName.rows.length -> variableName[0].length
    converted = converted.replace(/(\w+)\.rows\.length/g, '$1.length');

    // Pattern: variableName.rows -> variableName
    converted = converted.replace(/(\w+)\.rows/g, '$1');

    // Step 5: Handle RETURNING clauses
    // Find INSERT/UPDATE/DELETE with RETURNING and convert them

    // INSERT ... RETURNING *
    converted = converted.replace(
        /(INSERT\s+INTO\s+\w+\s*\([^)]+\)\s*VALUES\s*\([^)]+\))\s*RETURNING\s+\*/gi,
        '$1'
    );

    // INSERT ... RETURNING specific columns
    converted = converted.replace(
        /(INSERT\s+INTO\s+(\w+)\s*\([^)]+\)\s*VALUES\s*\([^)]+\))\s*RETURNING\s+([^`'"]+)/gi,
        (match, insertPart, tableName, columns) => {
            return insertPart;
        }
    );

    // UPDATE ... RETURNING *
    converted = converted.replace(
        /(UPDATE\s+\w+\s+SET\s+[^W]+WHERE\s+[^R]+)\s*RETURNING\s+\*/gi,
        '$1'
    );

    // DELETE ... RETURNING
    converted = converted.replace(
        /(DELETE\s+FROM\s+\w+\s+WHERE\s+[^R]+)\s*RETURNING\s+\w+/gi,
        '$1'
    );

    // Step 6: Add code to fetch inserted/updated records after INSERT/UPDATE
    // This is complex and needs to be done carefully for each RETURNING case

    return converted;
}

function addFetchAfterInsert(content) {
    // Pattern: const [result] = await pool.execute(`INSERT INTO tablename ...`);
    // Need to add: const [rows] = await pool.execute('SELECT * FROM tablename WHERE id = ?', [result.insertId]);

    // This is complex, so we'll add comments for manual review
    if (content.includes('INSERT INTO')) {
        content = '// NOTE: INSERT statements may need manual review to fetch inserted records\n' + content;
    }

    return content;
}

function convertFile(filePath) {
    console.log(`\nConverting ${path.basename(filePath)}...`);

    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // Convert PostgreSQL to MySQL
        content = convertPostgresToMySQL(content);

        // Add fetch after insert where needed
        content = addFetchAfterInsert(content);

        // Check if any changes were made
        if (content === originalContent) {
            console.log(`  ℹ️  No changes needed for ${path.basename(filePath)}`);
            return;
        }

        // Backup original file
        const backupPath = filePath + '.backup';
        fs.writeFileSync(backupPath, originalContent, 'utf8');
        console.log(`  💾 Backup created: ${path.basename(backupPath)}`);

        // Write converted content
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ Converted ${path.basename(filePath)}`);

        // Check for potential issues
        if (content.includes('RETURNING')) {
            console.log(`  ⚠️  WARNING: Still contains RETURNING clause - needs manual review`);
        }
        if (content.includes('$')) {
            console.log(`  ⚠️  WARNING: May still contain $ placeholders - needs manual review`);
        }

    } catch (error) {
        console.error(`  ❌ Error converting ${path.basename(filePath)}:`, error.message);
    }
}

// Main execution
console.log('🔄 Starting PostgreSQL to MySQL conversion...\n');
console.log('Files to convert:', files.length);

files.forEach(file => {
    const filePath = path.join(controllersDir, file);
    if (fs.existsSync(filePath)) {
        convertFile(filePath);
    } else {
        console.log(`\n⚠️  File not found: ${file}`);
    }
});

console.log('\n✅ Conversion complete!');
console.log('\n📝 Next steps:');
console.log('1. Review all converted files for accuracy');
console.log('2. Manually fix RETURNING clauses');
console.log('3. Test each endpoint');
console.log('4. Remove .backup files once verified');
