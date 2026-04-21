const express = require('express');
const router = express.Router();
const db = require('../db');

const getConnection = () => db.getConnection();

const resultListQuery = `
    SELECT
        ea.attempt_id,
        ea.student_id,
        s.student_name,
        s.roll_no,
        s.email,
        s.batch_name,
        s.mobile_no,
        e.exam_id,
        e.exam_name,
        e.exam_type,
        e.exam_date,
        e.exam_time,
        e.target_batch_name,
        e.target_admission_year,
        ea.start_time,
        ea.end_time,
        ea.submitted_at,
        ea.time_limit_minutes,
        ea.time_taken_seconds,
        ea.total_questions,
        ea.total_marks,
        ea.attempt_status,
        (
            SELECT COALESCE(SUM(sr.is_correct), 0)
            FROM student_responses sr
            WHERE sr.attempt_id = ea.attempt_id
        ) AS correct_answers,
        (
            SELECT COUNT(*)
            FROM student_responses sr
            WHERE sr.attempt_id = ea.attempt_id
        ) AS attempted_questions,
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
    JOIN students s ON ea.student_id = s.student_id
    JOIN exams e ON ea.exam_id = e.exam_id
`;

// Get all results for admin management
router.get('/', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT
                ea.attempt_id,
                ea.student_id,
                s.student_name,
                s.roll_no,
                e.exam_id,
                e.exam_name,
                e.exam_type,
                ea.submitted_at,
                ea.total_questions,
                (
                    SELECT COUNT(*) FROM student_responses sr WHERE sr.attempt_id = ea.attempt_id
                ) AS attempted_questions,
                (
                    SELECT COALESCE(SUM(sr.is_correct), 0)
                    FROM student_responses sr
                    WHERE sr.attempt_id = ea.attempt_id
                ) AS correct_answers
            FROM exam_attempts ea
            JOIN students s ON ea.student_id = s.student_id
            JOIN exams e ON ea.exam_id = e.exam_id
            ORDER BY COALESCE(ea.submitted_at, ea.end_time, ea.start_time) DESC, ea.attempt_id DESC
        `);

        res.json(results.map((result) => {
            const attempted = Number(result.attempted_questions || 0);
            const correct = Number(result.correct_answers || 0);
            const percentage = attempted > 0 ? (correct / attempted) * 100 : 0;
            return {
                ...result,
                percentage: percentage.toFixed(2),
                correct_answers: correct,
                wrong_answers: attempted - correct,
                result_status: percentage >= 40 ? 'Pass' : 'Fail'
            };
        }));
    } catch (error) {
        console.error('Error fetching admin results:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get detailed result for admin view
router.get('/:attemptId', async (req, res) => {
    const attemptId = req.params.attemptId;
    
    try {
        const [result] = await db.query(`
            ${resultListQuery}
            WHERE ea.attempt_id = ?
        `, [attemptId]);
        
        if (result.length === 0) {
            return res.status(404).json({ error: 'Result not found' });
        }

        const numberToLabel = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' };
        
        const [responses] = await db.query(`
            SELECT
                sr.question_id,
                sr.selected_answer,
                q.question_text,
                q.marks,
                q.explanation_text,
                q.image_path,
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
        
        // Recalculate is_correct to fix old data
        const processedResponses = responses.map(response => {
            let selectedLabel = response.selected_answer;
            if (typeof selectedLabel === 'number') {
                selectedLabel = numberToLabel[selectedLabel] || String(selectedLabel);
            } else if (typeof selectedLabel === 'string') {
                const num = parseInt(selectedLabel);
                if (!isNaN(num) && numberToLabel[num]) {
                    selectedLabel = numberToLabel[num];
                } else {
                    selectedLabel = selectedLabel.toUpperCase().trim();
                }
            }
            const correctLabel = response.correct_option_label;
            const isCorrect = correctLabel && correctLabel === selectedLabel ? 1 : 0;
            return { ...response, is_correct: isCorrect };
        });
        
        // Recalculate percentage from processed responses
        const correctAnswers = processedResponses.filter(r => r.is_correct === 1).length;
        const attemptedQuestions = processedResponses.length;
        const percentage = attemptedQuestions > 0 ? (correctAnswers / attemptedQuestions) * 100 : 0;
        
        res.json({
            result: {
                ...result[0],
                percentage: percentage.toFixed(2),
                correct_answers: correctAnswers,
                wrong_answers: attemptedQuestions - correctAnswers,
                result_status: percentage >= 40 ? 'Pass' : 'Fail'
            },
            responses: processedResponses.map((response) => ({
                ...response,
                options: response.options_text ? response.options_text.split('|') : []
            }))
        });
        
    } catch (error) {
        console.error('Error fetching detailed result:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get results filtered by exam type
router.get('/by-exam-type/:examType', async (req, res) => {
    const examType = req.params.examType;
    
    try {
        const [results] = await db.query(`
            ${resultListQuery}
            WHERE e.exam_type = ?
            ORDER BY COALESCE(ea.submitted_at, ea.end_time, ea.start_time) DESC, ea.attempt_id DESC
        `, [examType]);
        
        res.json(results.map((result) => ({
            ...result,
            percentage: Number(result.percentage || 0),
            result_status: Number(result.percentage || 0) >= 40 ? 'Pass' : 'Fail'
        })));
        
    } catch (error) {
        console.error('Error fetching results by exam type:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete result (admin only)
router.delete('/:attemptId', async (req, res) => {
    const attemptId = req.params.attemptId;
    let connection;
    
    try {
        connection = await getConnection();
        await connection.query('START TRANSACTION');
        
        // Delete student responses
        await connection.query('DELETE FROM student_responses WHERE attempt_id = ?', [attemptId]);
        
        // Delete performance summary if exists
        await connection.query('DELETE FROM performance_summary WHERE attempt_id = ?', [attemptId]);
        
        // Delete exam attempt
        await connection.query('DELETE FROM exam_attempts WHERE attempt_id = ?', [attemptId]);
        
        await connection.query('COMMIT');
        
        res.json({ message: 'Result deleted successfully' });
        
    } catch (error) {
        if (connection) {
            await connection.query('ROLLBACK');
        }
        console.error('Error deleting result:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;
