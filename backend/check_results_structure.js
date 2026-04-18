const db = require('./db');

async function checkResultsStructure() {
  try {
    console.log('Checking results table structure...');
    const [results] = await db.execute('DESCRIBE results');
    console.log('Results table columns:');
    results.forEach(row => console.log(`${row.Field}: ${row.Type} (${row.Null === 'NO' ? 'NOT NULL' : 'NULL'})`));
    
    // Check if there are any existing results
    const [existingResults] = await db.execute('SELECT COUNT(*) as count FROM results');
    console.log(`Existing results count: ${existingResults[0].count}`);
    
  } catch (error) {
    console.error('Error checking results structure:', error);
  } finally {
    process.exit(0);
  }
}

checkResultsStructure();
