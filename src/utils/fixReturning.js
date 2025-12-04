const fs = require('fs');
const path = require('path');

// Controllers directory
const controllersDir = path.join(__dirname, '../controllers');

// List of controllers to fix RETURNING clauses
const controllers = [
    'assignmentController.js',
    'customerController.js',
    'employeeController.js',
    'projectController.js',
    'teamController.js',
    'userController.js'
];

function fixReturningClauses(filePath) {
    console.log(`\nFixing RETURNING clauses in: ${path.basename(filePath)}`);

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove RETURNING from DELETE statements
    // Pattern: DELETE FROM table WHERE condition RETURNING column
    const deleteReturningPattern = /(DELETE\s+FROM\s+\w+\s+WHERE\s+[^']+?)\s+RETURNING\s+\w+/gi;
    if (deleteReturningPattern.test(content)) {
        content = content.replace(deleteReturningPattern, '$1');
        modified = true;
        console.log('  ✓ Removed RETURNING from DELETE statements');
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('  ✅ File updated');
    } else {
        console.log('  ℹ️  No RETURNING clauses found');
    }
}

// Process all controllers
console.log('🔄 Fixing RETURNING clauses...\n');

controllers.forEach(controller => {
    const filePath = path.join(controllersDir, controller);
    if (fs.existsSync(filePath)) {
        try {
            fixReturningClauses(filePath);
        } catch (error) {
            console.error(`  ❌ Error: ${error.message}`);
        }
    } else {
        console.log(`\n⚠️  File not found: ${controller}`);
    }
});

console.log('\n✅ RETURNING clause fixes complete!\n');
