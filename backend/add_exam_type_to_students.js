const db = require('./db');

async function addExamTypeToStudents() {
  try {
    console.log('Adding exam_type column to students table...');
    
    // Add exam_type column to students table
    await db.execute('ALTER TABLE students ADD COLUMN exam_type VARCHAR(50) DEFAULT "NDA"');
    console.log('Added exam_type column to students table');
    
    // Update existing students to have NDA as default exam type
    await db.execute('UPDATE students SET exam_type = "NDA" WHERE exam_type IS NULL');
    console.log('Updated existing students with default exam type');
    
    console.log('Student table update completed successfully!');
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists, skipping...');
    } else {
      console.error('Error updating student table:', error);
    }
  } finally {
    process.exit(0);
  }
}

addExamTypeToStudents();
