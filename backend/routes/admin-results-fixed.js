const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all results for admin management
router.get('/', async (req, res) => {
    try {
        console.log('Fetching admin results...');
        
        // Simple query that only uses existing columns
        const [results] = await db.execute(`
            SELECT 
                ea.attempt_id,
                ea.student_id,
                s.student_name,
                s.roll_no,
                s.batch_name,
                e.exam_id,
                e.exam_name,
                e.exam_type,
                ea.start_time,
                ea.end_time,
                ea.attempt_status,
                ea.submitted_at
            FROM exam_attempts ea
            JOIN students s ON ea.student_id = s.student_id
            JOIN exams e ON ea.exam_id = e.exam_id
            WHERE ea.attempt_status = 'Completed'
            ORDER BY ea.attempt_id DESC
            LIMIT 10
        `);
        
        console.log('Results fetched:', results.length);
        res.json(results);
        
    } catch (error) {
        console.error('Error fetching admin results:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get detailed result for admin view
router.get('/:attemptId', async (req, res) => {
    const attemptId = req.params.attemptId;
    
    try {
        const [result] = await db.execute(`
            SELECT 
                ea.*,
                s.student_name,
                s.roll_no,
                s.batch_name,
                e.exam_id,
                e.exam_name,
                e.exam_type
            FROM exam_attempts ea
            JOIN students s ON ea.student_id = s.student_id
            JOIN exams e ON ea.exam_id = e.exam_id
            WHERE ea.attempt_id = ?
        `, [attemptId]);
        
        if (result.length === 0) {
            return res.status(404).json({ error: 'Result not found' });
        }
        
        // Get detailed responses for this attempt
        const [responses] = await db.execute(`
            SELECT 
                sr.question_id,
                sr.selected_answer,
                sr.is_correct,
                q.question_text,
                qo.option_text as correct_option_text,
                q.marks,
                q.explanation_text
            FROM student_responses sr
            JOIN questions q ON sr.question_id = q.question_id
            LEFT JOIN question_options qo ON sr.question_id = qo.question_id AND qo.is_correct = 1
            WHERE sr.attempt_id = ?
            ORDER BY sr.question_id
        `, [attemptId]);
        
        res.json({
            result: result[0],
            responses: responses
        });
        
    } catch (error) {
        console.error('Error fetching detailed result:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
