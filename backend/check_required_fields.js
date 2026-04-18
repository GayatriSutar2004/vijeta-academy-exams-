const db = require('./db');

async function checkRequiredFields() {
  try {
    console.log('Checking required fields for exams table...');
    const [results] = await db.execute('SHOW COLUMNS FROM exams');
    console.log('Exams table columns:');
    results.forEach(row => {
      if (row.Null === 'NO' && row.Default === null) {
        console.log(`REQUIRED: ${row.Field} (${row.Type})`);
      } else {
        console.log(`OPTIONAL: ${row.Field} (${row.Type}) - Default: ${row.Default}`);
      }
    });
    
  } catch (error) {
    console.error('Error checking required fields:', error);
  } finally {
    process.exit(0);
  }
}

checkRequiredFields();
