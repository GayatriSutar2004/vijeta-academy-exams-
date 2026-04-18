const db = require('./db');

async function fixAdminResults() {
    try {
        console.log('=== FIXING ADMIN RESULTS QUERY ===');
        
        // Check exact table structure
        const [examAttempts] = await db.execute("DESCRIBE exam_attempts");
        console.log('\n=== exam_attempts columns ===');
        examAttempts.forEach(col => {
            console.log(`${col.Field}: ${col.Type} (Null: ${col.Null})`);
        });
        
        // Create a simple working query with correct column names
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
                ea.attempt_status,
                0 as total_questions,
                0 as correct_answers,
                0.0 as percentage,
                CASE 
                    WHEN 0.0 >= 40 THEN 'Pass'
                    ELSE 'Fail'
                END as result_status
            FROM exam_attempts ea
            JOIN students s ON ea.student_id = s.student_id
            JOIN exams e ON ea.exam_id = e.exam_id
            WHERE ea.attempt_status = 'Completed'
            ORDER BY ea.attempt_id DESC
            LIMIT 5
        `);
        
        console.log('Fixed query executed successfully');
        console.log('Results count:', results.length);
        
        if (results.length > 0) {
            console.log('Sample result:', results[0]);
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('Fix error:', error);
        process.exit(1);
    }
}

fixAdminResults();
