const db = require('./db');

async function checkExamTypes() {
  try {
    console.log('Checking exam_type_id values...');
    
    // Check if there's an exam_types table
    try {
      const [examTypes] = await db.execute('SELECT * FROM exam_types LIMIT 5');
      console.log('Available exam types:');
      examTypes.forEach(type => console.log(type));
    } catch (err) {
      console.log('No exam_types table found, checking existing exams...');
      
      // Check existing exams to see what exam_type_id values are used
      const [existingExams] = await db.execute('SELECT DISTINCT exam_type_id FROM exams LIMIT 5');
      console.log('Existing exam_type_id values:');
      existingExams.forEach(exam => console.log(exam));
    }
    
  } catch (error) {
    console.error('Error checking exam types:', error);
  } finally {
    process.exit(0);
  }
}

checkExamTypes();
