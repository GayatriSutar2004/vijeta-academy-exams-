const express = require('express');
const router = express.Router();
const db = require('../db');

const buildResultStatus = (percentage) => (Number(percentage || 0) >= 40 ? 'Pass' : 'Fail');

const getNextRollNo = async () => {
  const [rows] = await db.query(`
    SELECT roll_no
    FROM students
    WHERE roll_no REGEXP '^[0-9]+$'
    ORDER BY CAST(roll_no AS UNSIGNED) DESC
    LIMIT 1
  `);

  const currentMax = rows.length > 0 ? Number(rows[0].roll_no) : 0;
  return String(currentMax + 1);
};

const findDuplicateStudent = async ({ rollNo, email, excludeStudentId = null }) => {
  const conditions = [];
  const params = [];

  if (rollNo) {
    conditions.push('roll_no = ?');
    params.push(rollNo);
  }

  if (email) {
    conditions.push('email = ?');
    params.push(email);
  }

  if (conditions.length === 0) {
    return [];
  }

  let query = `
    SELECT student_id, roll_no, email
    FROM students
    WHERE (${conditions.join(' OR ')})
  `;

  if (excludeStudentId) {
    query += ' AND student_id <> ?';
    params.push(excludeStudentId);
  }

  const [rows] = await db.query(query, params);
  return rows;
};

const loadStudentAttempts = async (studentId) => {
  const [attempts] = await db.query(`
    SELECT
      ea.attempt_id,
      ea.exam_id,
      e.exam_name,
      e.exam_type,
      e.exam_date,
      e.exam_time,
      ea.start_time,
      ea.end_time,
      ea.submitted_at,
      ea.time_taken_seconds,
      ea.time_limit_minutes,
      ea.total_questions AS attempt_total_questions,
      ea.total_marks AS attempt_total_marks,
      ea.attempt_status,
      (
        SELECT COUNT(*)
        FROM student_responses sr
        WHERE sr.attempt_id = ea.attempt_id
      ) AS answered_questions,
      (
        SELECT COALESCE(SUM(sr.is_correct), 0)
        FROM student_responses sr
        WHERE sr.attempt_id = ea.attempt_id
      ) AS correct_answers,
      (
        SELECT ROUND(
          CASE
            WHEN SUM(q.marks) > 0 THEN (SUM(CASE WHEN sr.is_correct = 1 THEN q.marks ELSE 0 END) / SUM(q.marks)) * 100
            ELSE 0
          END,
          2
        )
        FROM student_responses sr
        JOIN questions q ON q.question_id = sr.question_id
        WHERE sr.attempt_id = ea.attempt_id
      ) AS percentage
    FROM exam_attempts ea
    JOIN exams e ON e.exam_id = ea.exam_id
    WHERE ea.student_id = ?
    ORDER BY COALESCE(ea.submitted_at, ea.end_time, ea.start_time) DESC, ea.attempt_id DESC
  `, [studentId]);

  return attempts.map((attempt) => ({
    ...attempt,
    percentage: Number(attempt.percentage || 0),
    answered_questions: Number(attempt.answered_questions || 0),
    correct_answers: Number(attempt.correct_answers || 0),
    result_status: buildResultStatus(attempt.percentage)
  }));
};

const loadAssignedExams = async (studentId) => {
  const [exams] = await db.query(`
    SELECT
      e.exam_id,
      e.exam_name,
      e.exam_type,
      e.exam_date,
      e.exam_time,
      e.duration_minutes,
      e.total_questions,
      e.total_marks,
      e.exam_status
    FROM exam_students es
    JOIN exams e ON e.exam_id = es.exam_id
    WHERE es.student_id = ?
    ORDER BY e.exam_date DESC, e.exam_time DESC, e.exam_id DESC
  `, [studentId]);

  return exams;
};

const loadAttemptResponses = async (attemptId) => {
  const [responses] = await db.query(`
    SELECT
      sr.question_id,
      sr.selected_answer,
      sr.is_correct,
      q.question_text,
      q.marks,
      q.explanation_text,
      COALESCE(q.section_name, 'General') AS section_name,
      (
        SELECT GROUP_CONCAT(CONCAT(qo.option_label, ') ', qo.option_text) ORDER BY qo.option_label SEPARATOR '|')
        FROM question_options qo
        WHERE qo.question_id = q.question_id
      ) AS options_text,
      (
        SELECT qo.option_label
        FROM question_options qo
        WHERE qo.question_id = q.question_id AND qo.is_correct = 1
        LIMIT 1
      ) AS correct_option_label,
      (
        SELECT qo.option_text
        FROM question_options qo
        WHERE qo.question_id = q.question_id AND qo.is_correct = 1
        LIMIT 1
      ) AS correct_option_text
    FROM student_responses sr
    JOIN questions q ON q.question_id = sr.question_id
    WHERE sr.attempt_id = ?
    ORDER BY sr.question_id
  `, [attemptId]);

  return responses.map((response) => ({
    ...response,
    options: response.options_text ? response.options_text.split('|') : []
  }));
};

router.get('/next-roll-no', async (req, res) => {
  try {
    const nextRollNo = await getNextRollNo();
    res.json({
      next_roll_no: nextRollNo,
      suggested_email: nextRollNo
    });
  } catch (err) {
    console.log('DB ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM students ORDER BY student_name');
    res.json(results);
  } catch (err) {
    console.log('DB ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/with-results', async (req, res) => {
  try {
    const [students] = await db.query(`
      SELECT *
      FROM students
      ORDER BY created_at DESC, student_id DESC
    `);

    const studentsWithDetails = await Promise.all(
      students.map(async (student) => {
        const attempts = await loadStudentAttempts(student.student_id);
        const assignedExams = await loadAssignedExams(student.student_id);
        const latestAttemptResponses = attempts.length > 0
          ? await loadAttemptResponses(attempts[0].attempt_id)
          : [];

        const totalAttempts = attempts.length;
        const highestScore = attempts.reduce((max, attempt) => Math.max(max, Number(attempt.percentage || 0)), 0);
        const averageScore = totalAttempts > 0
          ? attempts.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0) / totalAttempts
          : 0;

        return {
          ...student,
          assigned_exams: assignedExams,
          attempts,
          latest_attempt_responses: latestAttemptResponses,
          performance_summary: {
            total_exams_available: assignedExams.length,
            exams_attempted: totalAttempts,
            highest_score: Number(highestScore.toFixed(2)),
            average_score: Number(averageScore.toFixed(2)),
            latest_result_status: totalAttempts > 0 ? attempts[0].result_status : 'N/A'
          }
        };
      })
    );

    res.json(studentsWithDetails);
  } catch (err) {
    console.log('DB ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/add', async (req, res) => {
  const {
    student_name,
    batch_name,
    admission_year,
    roll_no,
    mobile_no,
    email,
    password_hash,
    exam_type,
    city,
    state,
    college_name
  } = req.body;

  if (!student_name || !batch_name || !admission_year || !mobile_no || !password_hash) {
    return res.status(400).json({ message: 'Please fill all required fields!' });
  }

  try {
    const assignedRollNo = (roll_no || await getNextRollNo()).toString().trim();
    const assignedEmail = (email || assignedRollNo).toString().trim();

    const duplicates = await findDuplicateStudent({
      rollNo: assignedRollNo,
      email: assignedEmail
    });

    if (duplicates.some((student) => student.roll_no === assignedRollNo)) {
      return res.status(409).json({ message: 'Roll number already exists. Please use the next generated roll number.' });
    }

    if (duplicates.some((student) => student.email === assignedEmail)) {
      return res.status(409).json({ message: 'Email already exists for another student.' });
    }

    const [result] = await db.execute(
      `INSERT INTO students
      (student_name, batch_name, admission_year, roll_no, mobile_no, email, password_hash, exam_type, city, state, college_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_name,
        batch_name,
        admission_year,
        assignedRollNo,
        mobile_no,
        assignedEmail,
        password_hash,
        exam_type || 'NDA',
        city || '',
        state || '',
        college_name || ''
      ]
    );

    res.json({
      message: 'Student added successfully!',
      student_id: result.insertId,
      roll_no: assignedRollNo,
      email: assignedEmail
    });
  } catch (err) {
    console.log('DB ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/update/:id', async (req, res) => {
  const id = req.params.id;
  const { student_name, batch_name, mobile_no, email } = req.body;

  if (!student_name || !batch_name || !mobile_no || !email) {
    return res.status(400).json({ message: 'All fields required!' });
  }

  try {
    const trimmedEmail = email.trim();
    const duplicates = await findDuplicateStudent({
      email: trimmedEmail,
      excludeStudentId: id
    });

    if (duplicates.some((student) => student.email === trimmedEmail)) {
      return res.status(409).json({ message: 'Email already exists for another student.' });
    }

    await db.execute(
      `UPDATE students
      SET student_name=?, batch_name=?, mobile_no=?, email=?
      WHERE student_id=?`,
      [student_name, batch_name, mobile_no, trimmedEmail, id]
    );
    res.json({ message: 'Student updated successfully!' });
  } catch (err) {
    console.log('DB ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/reset-password/:id', async (req, res) => {
  const id = req.params.id;
  const { new_password } = req.body;

  if (!new_password) {
    return res.status(400).json({ message: 'New password is required!' });
  }

  try {
    await db.execute(
      `UPDATE students
      SET password_hash=?
      WHERE student_id=?`,
      [new_password, id]
    );
    res.json({ message: 'Password reset successfully!' });
  } catch (err) {
    console.log('DB ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/delete/:id', async (req, res) => {
  const id = req.params.id;

  try {
    await db.execute('DELETE FROM students WHERE student_id = ?', [id]);
    res.json({ message: 'Student deleted successfully!' });
  } catch (err) {
    console.log('DB ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const [results] = await db.execute(
      'SELECT * FROM students WHERE email = ? AND password_hash = ?',
      [email, password]
    );

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({ message: 'Login successful', student: results[0] });
  } catch (err) {
    console.log('DB ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
