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
        
        res.json({
            result: result[0]
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
            WHERE e.exam_type = ?
            ORDER BY ea.attempt_id DESC
            LIMIT 10
        `, [examType]);
        
        res.json(results);
        
    } catch (error) {
        console.error('Error fetching results by exam type:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete result (admin only)
router.delete('/:attemptId', async (req, res) => {
    const attemptId = req.params.attemptId;
    
    try {
        await db.execute('START TRANSACTION');
        
        // Delete student responses
        await db.execute('DELETE FROM student_responses WHERE attempt_id = ?', [attemptId]);
        
        // Delete performance summary if exists
        await db.execute('DELETE FROM performance_summary WHERE attempt_id = ?', [attemptId]);
        
        // Delete exam attempt
        await db.execute('DELETE FROM exam_attempts WHERE attempt_id = ?', [attemptId]);
        
        await db.execute('COMMIT');
        
        res.json({ message: 'Result deleted successfully' });
        
    } catch (error) {
        await db.execute('ROLLBACK');
        console.error('Error deleting result:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
