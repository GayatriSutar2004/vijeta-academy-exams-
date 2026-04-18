const db = require('./db');

async function checkDatabaseStructure() {
    try {
        console.log('=== DATABASE STRUCTURE ANALYSIS ===');
        
        // Check existing tables
        const [tables] = await db.execute("SHOW TABLES");
        console.log('Existing tables:', tables.map(t => Object.values(t)[0]));
        
        // Check questions table structure
        try {
            const [questionsStructure] = await db.execute("DESCRIBE questions");
            console.log('\n=== QUESTIONS TABLE STRUCTURE ===');
            console.log(questionsStructure);
        } catch (err) {
            console.log('Questions table does not exist, will need to create it');
        }
        
        // Check if we need to create enhanced question storage
        console.log('\n=== ENHANCED QUESTION STORAGE NEEDED ===');
        console.log('1. Questions table with proper structure');
        console.log('2. Options table for multiple choice options');
        console.log('3. Sections table for section-wise organization');
        console.log('4. Enhanced parsing logic for Word documents');
        
        process.exit(0);
    } catch (error) {
        console.error('Database error:', error);
        process.exit(1);
    }
}

checkDatabaseStructure();
