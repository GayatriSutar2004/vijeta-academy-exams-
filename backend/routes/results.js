const express = require('express');
const router = express.Router();
const db = require('../db');

// Add result
router.post('/add', async (req, res) => {
  const { 
    attempt_id, 
    total_questions, 
    attempted_questions, 
    correct_answers, 
    wrong_answers, 
    not_attempted_questions, 
    marks_obtained, 
    percentage, 
    result_status 
  } = req.body;

  try {
    await db.execute(
      `INSERT INTO results 
      (attempt_id, total_questions, attempted_questions, correct_answers, wrong_answers, not_attempted_questions, marks_obtained, percentage, result_status, generated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [attempt_id, total_questions, attempted_questions, correct_answers, wrong_answers, not_attempted_questions, marks_obtained, percentage, result_status]
    );
    res.json({ message: "Result added successfully!" });
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all results
router.get('/', async (req, res) => {
  try {
    const [results] = await db.execute(`
      SELECT r.*, s.student_name, s.roll_no, s.batch_name, e.exam_name, e.exam_type 
      FROM results r 
      LEFT JOIN students s ON r.attempt_id = s.student_id 
      LEFT JOIN exams e ON r.attempt_id = e.exam_id 
      ORDER BY r.generated_at DESC
    `);
    res.json(results);
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get results for a student
router.get('/student/:studentId', async (req, res) => {
  const { studentId } = req.params;
  try {
    const [results] = await db.execute(`
      SELECT r.*, e.exam_name, e.exam_type 
      FROM results r 
      LEFT JOIN exams e ON r.attempt_id = e.exam_id 
      WHERE r.attempt_id = ? 
      ORDER BY r.generated_at DESC
    `, [studentId]);
    res.json(results);
  } catch(err) {
    console.log("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;