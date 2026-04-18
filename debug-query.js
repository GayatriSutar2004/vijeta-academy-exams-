const db = require('./backend/db');

async function test() {
  const [results] = await db.query(`
    SELECT e.*, 
    (SELECT COUNT(*) FROM exam_students es WHERE es.exam_id = e.exam_id) as assigned_students
    FROM exams e
    ORDER BY e.created_at DESC
  `);
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });