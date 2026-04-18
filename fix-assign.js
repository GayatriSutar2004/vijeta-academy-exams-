const db = require('./backend/db');

async function assignStudent() {
  try {
    // Clear existing assignments for exam 16
    await db.query('DELETE FROM exam_students WHERE exam_id = 16');
    console.log('Cleared existing assignments');
    
    // Get students matching SSC-A batch
    const [students] = await db.query(
      'SELECT student_id FROM students WHERE exam_type = ? AND batch_name = ?',
      ['SSC', 'SSC-A']
    );
    console.log('Found students:', students.length);
    
    // Assign each student
    for (const student of students) {
      await db.query(
        'INSERT IGNORE INTO exam_students (exam_id, student_id) VALUES (?, ?)',
        [16, student.student_id]
      );
      console.log('Assigned student_id:', student.student_id);
    }
    
    console.log('Assignment complete!');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

assignStudent();