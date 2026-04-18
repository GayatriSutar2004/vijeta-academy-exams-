const db = require('./db');

async function checkDBStructure() {
  try {
    console.log('Checking exams table structure...');
    const [results] = await db.execute('DESCRIBE exams');
    console.log('Exams table structure:');
    results.forEach(row => console.log(row));
    
    console.log('\nChecking questions table structure...');
    const [questions] = await db.execute('DESCRIBE questions');
    console.log('Questions table structure:');
    questions.forEach(row => console.log(row));
    
  } catch (error) {
    console.error('Error checking DB structure:', error);
  } finally {
    process.exit(0);
  }
}

checkDBStructure();
