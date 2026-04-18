const db = require('./db');

async function debugQuery() {
    try {
        console.log('=== DEBUGGING DATABASE QUERY ===');
        
        // Test the exact query from admin-results.js
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
                ea.time_taken_seconds,
                ea.status,
                ps.total_questions,
                ps.correct_answers,
                ps.percentage,
                CASE 
                    WHEN ps.percentage >= 40 THEN 'Pass'
                    ELSE 'Fail'
                END as result_status
            FROM exam_attempts ea
            JOIN students s ON ea.student_id = s.student_id
            JOIN exams e ON ea.exam_id = e.exam_id
            LEFT JOIN performance_summary ps ON ea.attempt_id = ps.attempt_id
            ORDER BY ea.attempt_id DESC
            LIMIT 10
        `);
        
        console.log('Query executed successfully');
        console.log('Results count:', results.length);
        
        if (results.length > 0) {
            console.log('Sample result:', results[0]);
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('Debug query error:', error);
        process.exit(1);
    }
}

debugQuery();
