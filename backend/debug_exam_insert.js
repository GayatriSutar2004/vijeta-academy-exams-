const db = require('./db');

async function debugExamInsert() {
  try {
    console.log('Testing exam insert with all required fields...');
    
    const examData = {
      exam_name: 'Debug Test Exam',
      duration_minutes: 60,
      total_questions: 3,
      exam_type_id: 3, // NDA
      exam_type: 'NDA',
      exam_date: new Date().toISOString().split('T')[0],
      exam_time: '09:00:00',
      created_by: 1
    };
    
    console.log('Inserting exam with data:', examData);
    
    const [result] = await db.execute(
      `INSERT INTO exams (exam_name, duration_minutes, total_questions, exam_type_id, exam_type, exam_date, exam_time, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [examData.exam_name, examData.duration_minutes, examData.total_questions, examData.exam_type_id, examData.exam_type, examData.exam_date, examData.exam_time, examData.created_by]
    );
    
    console.log('Exam inserted successfully! Exam ID:', result.insertId);
    
  } catch (error) {
    console.error('Error inserting exam:', error);
  } finally {
    process.exit(0);
  }
}

debugExamInsert();
