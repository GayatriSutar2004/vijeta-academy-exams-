const db = require('./db');

async function checkTables() {
    try {
        console.log('=== CHECKING DATABASE TABLES ===');
        
        // Check if required tables exist
        const [tables] = await db.execute("SHOW TABLES");
        console.log('Available tables:', tables.map(t => Object.values(t)[0]));
        
        // Check exam_attempts table structure
        try {
            const [examAttempts] = await db.execute("DESCRIBE exam_attempts");
            console.log('\n=== exam_attempts table structure ===');
            examAttempts.forEach(col => console.log(`${col.Field}: ${col.Type}`));
        } catch (err) {
            console.log('exam_attempts table error:', err.message);
        }
        
        // Check students table structure
        try {
            const [students] = await db.execute("DESCRIBE students");
            console.log('\n=== students table structure ===');
            students.forEach(col => console.log(`${col.Field}: ${col.Type}`));
        } catch (err) {
            console.log('students table error:', err.message);
        }
        
        // Check exams table structure
        try {
            const [exams] = await db.execute("DESCRIBE exams");
            console.log('\n=== exams table structure ===');
            exams.forEach(col => console.log(`${col.Field}: ${col.Type}`));
        } catch (err) {
            console.log('exams table error:', err.message);
        }
        
        // Check if performance_summary table exists
        try {
            const [perfSummary] = await db.execute("DESCRIBE performance_summary");
            console.log('\n=== performance_summary table structure ===');
            perfSummary.forEach(col => console.log(`${col.Field}: ${col.Type}`));
        } catch (err) {
            console.log('performance_summary table error:', err.message);
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('Database check error:', error);
        process.exit(1);
    }
}

checkTables();
