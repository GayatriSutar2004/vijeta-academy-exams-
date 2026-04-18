const express = require('express');
const router = express.Router();
const db = require('../db');

const getConnection = () => {
    return db.getConnection();
};

// Submit exam attempt
router.post('/', async (req, res) => {
    const { student_id, exam_id, answers, time_taken } = req.body;
    let connection;
    
    try {
        console.log('Starting transaction...');
        connection = await getConnection();
        await connection.query('START TRANSACTION');

        console.log('Fetching exam details...');
        const [examRows] = await connection.query(`
            SELECT exam_id, duration_minutes, total_questions, total_marks
            FROM exams
            WHERE exam_id = ?
        `, [exam_id]);

        if (examRows.length === 0) {
            console.log('Exam not found, rolling back.');
            await connection.query('ROLLBACK');
            return res.status(404).json({ error: 'Exam not found' });
        }

        const exam = examRows[0];

        console.log('Inserting exam attempt...');
        const [attemptResult] = await connection.query(`
            INSERT INTO exam_attempts (
                exam_id,
                student_id,
                start_time,
                end_time,
                submitted_at,
                time_limit_minutes,
                time_taken_seconds,
                attempt_status,
                total_questions,
                total_marks
            )
            VALUES (?, ?, NOW(), NOW(), NOW(), ?, ?, 'Submitted', ?, ?)
        `, [
            exam_id,
            student_id,
            exam.duration_minutes,
            time_taken,
            exam.total_questions,
            exam.total_marks || 0
        ]);
        
        const attemptId = attemptResult.insertId;
        console.log(`Attempt ID created: ${attemptId}`);
        
        const labelToNumber = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8 };

        for (const [questionId, selectedAnswer] of Object.entries(answers || {})) {
            console.log(`Processing question ID: ${questionId}, Answer: ${selectedAnswer}`);
            const [correctAnswer] = await connection.query(`
                SELECT qo.option_label 
                FROM question_options qo
                WHERE qo.question_id = ? AND qo.is_correct = 1
            `, [questionId]);
            
            const numericAnswer = labelToNumber[selectedAnswer] || selectedAnswer;
            const correctLabel = correctAnswer.length > 0 ? correctAnswer[0].option_label : null;
            const numericCorrect = correctLabel ? (labelToNumber[correctLabel] || correctLabel) : null;
            const isCorrect = correctLabel && correctLabel === selectedAnswer ? 1 : 0;
            
            await connection.query(`
                INSERT INTO student_responses (attempt_id, question_id, selected_answer, is_correct)
                VALUES (?, ?, ?, ?)
            `, [attemptId, questionId, numericAnswer, isCorrect]);
        }
        
        console.log('Calculating performance...');
        const [performanceResult] = await connection.query(`
            SELECT 
                COUNT(*) as attempted_questions,
                COALESCE(SUM(sr.is_correct), 0) as correct_answers,
                COALESCE(SUM(CASE WHEN sr.is_correct = 1 THEN q.marks ELSE 0 END), 0) as marks_obtained
            FROM student_responses sr
            JOIN questions q ON sr.question_id = q.question_id
            WHERE sr.attempt_id = ?
        `, [attemptId]);
        
        const performance = performanceResult[0];
        const maxMarks = Number(exam.total_marks || 0);
        const percentage = maxMarks > 0
            ? (Number(performance.marks_obtained || 0) / maxMarks) * 100
            : 0;

        console.log('Calculating aggregate stats...');
        const [attempts] = await connection.query(`
            SELECT 
                ea.attempt_id,
                ea.total_marks,
                ea.submitted_at,
                ea.end_time,
                ea.start_time
            FROM exam_attempts ea
            WHERE ea.student_id = ?
        `, [student_id]);

        let exams_attempted = attempts.length;
        let total_marks_obtained = 0;
        let total_percentage = 0;
        let last_exam_date = null;

        for (const att of attempts) {
            console.log(`Processing attempt ID for aggregation: ${att.attempt_id}`);
            const [marksRows] = await connection.query(`
                SELECT COALESCE(SUM(CASE WHEN sr.is_correct = 1 THEN q.marks ELSE 0 END), 0) as marks_obtained
                FROM student_responses sr
                JOIN questions q ON q.question_id = sr.question_id
                WHERE sr.attempt_id = ?
            `, [att.attempt_id]);
            
            const marks_obtained = Number(marksRows[0].marks_obtained || 0);
            total_marks_obtained += marks_obtained;
            const perc = att.total_marks > 0 ? (marks_obtained / att.total_marks) * 100 : 0;
            total_percentage += perc;
            
            const currentDate = att.submitted_at || att.end_time || att.start_time;
            if (!last_exam_date || (currentDate && new Date(currentDate) > new Date(last_exam_date))) {
                last_exam_date = currentDate;
            }
        }

        const average_percentage = exams_attempted > 0 ? total_percentage / exams_attempted : 0;

        console.log('Updating performance summary...');
        const [existingSummary] = await connection.query(
            'SELECT performance_id FROM performance_summary WHERE student_id = ? LIMIT 1',
            [student_id]
        );

        if (existingSummary.length > 0) {
            await connection.query(`
                UPDATE performance_summary 
                SET 
                    exams_attempted = ?, 
                    total_marks_obtained = ?, 
                    average_percentage = ?, 
                    last_exam_date = ?,
                    updated_at = NOW()
                WHERE performance_id = ?
            `, [
                exams_attempted,
                total_marks_obtained,
                average_percentage,
                last_exam_date,
                existingSummary[0].performance_id
            ]);
        } else {
            await connection.query(`
                INSERT INTO performance_summary (student_id, exams_attempted, total_marks_obtained, average_percentage, last_exam_date)
                VALUES (?, ?, ?, ?, ?)
            `, [
                student_id,
                exams_attempted,
                total_marks_obtained,
                average_percentage,
                last_exam_date
            ]);
        }

        console.log('Committing transaction...');
        await connection.query('COMMIT');
        
        res.json({
            success: true,
            attempt_id: attemptId,
            performance: {
                total_questions: Number(exam.total_questions || 0),
                attempted_questions: Number(performance.attempted_questions || 0),
                correct_answers: Number(performance.correct_answers || 0),
                total_marks: Number(performance.marks_obtained || 0),
                max_marks: maxMarks,
                percentage: percentage.toFixed(2)
            }
        });
        
    } catch (error) {
        if (connection) {
            await connection.query('ROLLBACK');
        }
        console.error('Error submitting exam attempt:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Get exam attempt results
router.get('/:attemptId', async (req, res) => {
    const attemptId = req.params.attemptId;
    
    try {
        const [attempt] = await db.query(`
            SELECT ea.*, s.student_name, s.roll_no, e.exam_name, e.exam_type
            FROM exam_attempts ea
            JOIN students s ON ea.student_id = s.student_id
            JOIN exams e ON ea.exam_id = e.exam_id
            WHERE ea.attempt_id = ?
        `, [attemptId]);
        
        if (attempt.length === 0) {
            return res.status(404).json({ error: 'Attempt not found' });
        }
        
        const [responses] = await db.query(`
            SELECT 
                sr.question_id,
                sr.selected_answer,
                sr.is_correct,
                q.question_text,
                q.marks,
                q.explanation_text,
                q.image_path,
                (
                    SELECT qo.option_label
                    FROM question_options qo
                    WHERE qo.question_id = sr.question_id AND qo.is_correct = 1
                    LIMIT 1
                ) AS correct_option_label,
                (
                    SELECT qo.option_text
                    FROM question_options qo
                    WHERE qo.question_id = sr.question_id AND qo.is_correct = 1
                    LIMIT 1
                ) AS correct_option_text
            FROM student_responses sr
            JOIN questions q ON sr.question_id = q.question_id
            WHERE sr.attempt_id = ?
            ORDER BY sr.question_id
        `, [attemptId]);
        
        const [performanceResult] = await db.query(`
            SELECT
                COUNT(*) as attempted_questions,
                COALESCE(SUM(sr.is_correct), 0) as correct_answers,
                COALESCE(SUM(CASE WHEN sr.is_correct = 1 THEN q.marks ELSE 0 END), 0) as marks_obtained
            FROM student_responses sr
            JOIN questions q ON sr.question_id = q.question_id
            WHERE sr.attempt_id = ?
        `, [attemptId]);

        const attemptPerformance = performanceResult[0];
        const totalQuestions = Number(attempt[0].total_questions || responses.length);
        const correctAnswers = Number(attemptPerformance.correct_answers || 0);
        const maxMarks = totalQuestions; // Each question has 1 mark by default
        const percentage = maxMarks > 0
            ? (correctAnswers / maxMarks) * 100
            : 0;
        
        res.json({
            attempt: attempt[0],
            responses: responses,
            performance: {
                total_questions: Number(attempt[0].total_questions || 0),
                attempted_questions: Number(attemptPerformance.attempted_questions || 0),
                correct_answers: Number(attemptPerformance.correct_answers || 0),
                total_marks: Number(attemptPerformance.marks_obtained || 0),
                max_marks: maxMarks,
                percentage: percentage.toFixed(2)
            }
        });
        
    } catch (error) {
        console.error('Error fetching attempt results:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get student's exam attempts
router.get('/student/:studentId', async (req, res) => {
    const studentId = req.params.studentId;
    
    try {
        const [attempts] = await db.query(`
            SELECT ea.*, e.exam_name, e.exam_type
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.exam_id
            WHERE ea.student_id = ?
            ORDER BY ea.submitted_at DESC
        `, [studentId]);
        
        res.json(attempts);
    } catch (error) {
        console.error('Error fetching student attempts:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
