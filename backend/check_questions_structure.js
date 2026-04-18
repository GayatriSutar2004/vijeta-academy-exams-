const db = require('./db');

async function checkQuestionsStructure() {
  try {
    console.log('Checking questions table structure...');
    const [results] = await db.execute('DESCRIBE questions');
    console.log('Questions table columns:');
    results.forEach(row => console.log(`${row.Field}: ${row.Type} (${row.Null === 'NO' ? 'NOT NULL' : 'NULL'})`));
    
    // Check if there are any questions
    const [questions] = await db.execute('SELECT * FROM questions LIMIT 3');
    console.log('\nSample questions:');
    questions.forEach(q => console.log(q));
    
  } catch (error) {
    console.error('Error checking questions structure:', error);
  } finally {
    process.exit(0);
  }
}

checkQuestionsStructure();
