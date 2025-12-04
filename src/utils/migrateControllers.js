const fs = require('fs');
const path = require('path');

// Controllers directory
const controllersDir = path.join(__dirname, '../controllers');

// List of controllers to update (excluding authController which is already done)
const controllers = [
    'dashboardController.js',
    'employeeController.js',
    'projectController.js',
    'customerController.js',
    'assignmentController.js',
    'teamController.js',
    'userController.js',
    'reportsController.js'
];

function convertController(filePath) {
    console.log(`\nProcessing: ${path.basename(filePath)}`);

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Replace pool.query with pool.execute and add destructuring
    const queryPattern = /const\s+(\w+)\s*=\s*await\s+pool\.query\(/g;
    if (queryPattern.test(content)) {
        content = content.replace(/const\s+(\w+)\s*=\s*await\s+pool\.query\(/g, 'const [$1] = await pool.execute(');
        modified = true;
        console.log('  ✓ Converted pool.query to pool.execute with destructuring');
    }

    // 2. Replace pool.query in Promise.all
    if (content.includes('pool.query(')) {
        content = content.replace(/pool\.query\(/g, 'pool.execute(');
        modified = true;
        console.log('  ✓ Replaced remaining pool.query with pool.execute');
    }

    // 3. Replace $1, $2, etc. with ?
    const dollarPattern = /\$\d+/g;
    if (dollarPattern.test(content)) {
        content = content.replace(/\$\d+/g, '?');
        modified = true;
        console.log('  ✓ Replaced $N placeholders with ?');
    }

    // 4. Fix .rows references
    // For Promise.all results: variableName.rows[0] -> variableName[0][0]
    if (content.includes('.rows[0]')) {
        content = content.replace(/(\w+)\.rows\[0\]/g, '$1[0][0]');
        modified = true;
        console.log('  ✓ Fixed .rows[0] references');
    }

    // For Promise.all results: variableName.rows.length -> variableName[0].length
    if (content.includes('.rows.length')) {
        content = content.replace(/(\w+)\.rows\.length/g, '$1.length');
        modified = true;
        console.log('  ✓ Fixed .rows.length references');
    }

    // General .rows -> just remove it (after destructuring)
    if (content.includes('.rows')) {
        content = content.replace(/(\w+)\.rows/g, '$1');
        modified = true;
        console.log('  ✓ Removed .rows references');
    }

    // 5. Handle RETURNING clauses
    if (content.includes('RETURNING')) {
        console.log('  ⚠️  Contains RETURNING clause - needs manual review!');

        // Remove RETURNING * from INSERT statements
        content = content.replace(/RETURNING\s+\*/gi, '');

        // Remove RETURNING column_list from INSERT statements
        content = content.replace(/RETURNING\s+[\w,\s]+`/gi, '`');

        modified = true;
        console.log('  ✓ Removed RETURNING clauses (manual review needed)');
    }

    if (modified) {
        // Create backup
        const backupPath = filePath + '.pg.backup';
        if (!fs.existsSync(backupPath)) {
            fs.writeFileSync(backupPath, fs.readFileSync(filePath), 'utf8');
            console.log('  💾 Created backup');
        }

        // Write modified content
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('  ✅ File updated');
    } else {
        console.log('  ℹ️  No changes needed');
    }
}

// Process all controllers
console.log('🔄 Starting controller conversion...\n');

controllers.forEach(controller => {
    const filePath = path.join(controllersDir, controller);
    if (fs.existsSync(filePath)) {
        try {
            convertController(filePath);
        } catch (error) {
            console.error(`  ❌ Error: ${error.message}`);
        }
    } else {
        console.log(`\n⚠️  File not found: ${controller}`);
    }
});

console.log('\n✅ Conversion complete!');
console.log('\n📋 Next steps:');
console.log('1. Review files marked with ⚠️  for manual fixes');
console.log('2. Handle RETURNING clauses by fetching inserted/updated records');
console.log('3. Test each endpoint');
console.log('4. Remove .pg.backup files once verified\n');
