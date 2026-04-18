const db = require('./db');

async function checkStudentStructure() {
  try {
    console.log('Checking students table structure...');
    const [results] = await db.execute('DESCRIBE students');
    console.log('Students table columns:');
    results.forEach(row => console.log(`${row.Field}: ${row.Type} (${row.Null === 'NO' ? 'NOT NULL' : 'NULL'})`));
    
  } catch (error) {
    console.error('Error checking student structure:', error);
  } finally {
    process.exit(0);
  }
}

checkStudentStructure();
