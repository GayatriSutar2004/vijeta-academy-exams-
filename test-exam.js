const db = require('./backend/db');

async function testSubmission() {
  try {
    // Insert exam attempt
    const [result] = await db.query(
      'INSERT INTO exam_attempts (student_id, exam_id, submitted_at, time_taken_seconds, time_limit_minutes, total_questions, attempt_status) VALUES (?, ?, NOW(), 600, 40, 3, "Completed")',
      [2, 17]
    );
    const attemptId = result.insertId;
    console.log('Created attempt:', attemptId);
    
    // Insert responses (2 correct, 1 wrong)
    await db.query(
      'INSERT INTO student_responses (attempt_id, question_id, selected_answer, is_correct) VALUES (?, ?, ?, ?)',
      [attemptId, 657, 1, 1]  // A is correct
    );
    await db.query(
      'INSERT INTO student_responses (attempt_id, question_id, selected_answer, is_correct) VALUES (?, ?, ?, ?)',
      [attemptId, 658, 2, 0]  // B is wrong
    );
    await db.query(
      'INSERT INTO student_responses (attempt_id, question_id, selected_answer, is_correct) VALUES (?, ?, ?, ?)',
      [attemptId, 659, 3, 1]  // C is correct
    );
    
    console.log('Added responses');
    
    // Check results
    const [attempts] = await db.query(
      'SELECT * FROM exam_attempts WHERE attempt_id = ?',
      [attemptId]
    );
    console.log('Attempt:', attempts[0]);
    
    // Get results via API
    console.log('\n=== Testing via API ===');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

testSubmission();