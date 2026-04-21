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
        const numberToLabel = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G', 8: 'H' };

        for (const [questionId, selectedAnswer] of Object.entries(answers || {})) {
            console.log(`Processing question ID: ${questionId}, Answer: ${selectedAnswer}`);
            const [correctAnswer] = await connection.query(`
                SELECT qo.option_label 
                FROM question_options qo
                WHERE qo.question_id = ? AND qo.is_correct = 1
            `, [questionId]);
            
            const correctLabel = correctAnswer.length > 0 ? correctAnswer[0].option_label : null;
            
            // Normalize selected answer to label (A, B, C, D)
            let selectedLabel = selectedAnswer;
            if (typeof selectedAnswer === 'number') {
                selectedLabel = numberToLabel[selectedAnswer] || String(selectedAnswer);
            } else if (typeof selectedAnswer === 'string') {
                // Check if it's a number string like "2" -> convert to "B"
                const num = parseInt(selectedAnswer);
                if (!isNaN(num) && numberToLabel[num]) {
                    selectedLabel = numberToLabel[num];
                } else {
                    selectedLabel = selectedAnswer.toUpperCase().trim();
                }
            }
            
            const isCorrect = correctLabel && correctLabel === selectedLabel ? 1 : 0;
            
            await connection.query(`
                INSERT INTO student_responses (attempt_id, question_id, selected_answer, is_correct)
                VALUES (?, ?, ?, ?)
            `, [attemptId, questionId, selectedLabel, isCorrect]);
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
        
        const labelToNumber = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
        // 1-based: 1=A, 2=B, 3=C, 4=D
// 1-based: 1=A, 2=B, 3=C, 4=D
        const numberToLabel = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' };
        
        // Convert answer to label format for comparison
        const normalizeAnswer = (answer) => {
            if (answer === null || answer === undefined) return null;
            if (typeof answer === 'number') {
                return numberToLabel[answer] || String(answer);
            }
            if (typeof answer === 'string') {
                const trimmed = answer.toUpperCase().trim();
                // Check if it's already A,B,C,D
                if (['A','B','C','D','E'].includes(trimmed)) return trimmed;
                // Check if it's a number string
                const num = parseInt(trimmed);
                if (!isNaN(num) && numberToLabel[num]) return numberToLabel[num];
                return trimmed;
            }
            return String(answer);
        };
        
        const [responses] = await db.query(`
            SELECT 
                sr.question_id,
                sr.selected_answer,
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
        
        // Recalculate is_correct dynamically to fix old data
        const processedResponses = responses.map(response => {
            const selectedLabel = normalizeAnswer(response.selected_answer);
            const correctLabel = response.correct_option_label;
            const isCorrect = (selectedLabel && correctLabel && selectedLabel === correctLabel) ? 1 : 0;
            return { ...response, is_correct: isCorrect };
        });
        
        const correctAnswers = processedResponses.filter(r => r.is_correct === 1).length;
        const attemptedQuestions = processedResponses.length;
        const marksObtained = correctAnswers;
        
        const totalQuestions = Number(attempt[0].total_questions || attemptedQuestions);
        const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        
        res.json({
            attempt: attempt[0],
            responses: processedResponses,
            performance: {
                total_questions: totalQuestions,
                attempted_questions: attemptedQuestions,
                correct_answers: correctAnswers,
                wrong_answers: attemptedQuestions - correctAnswers,
                total_marks: marksObtained,
                max_marks: totalQuestions,
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
