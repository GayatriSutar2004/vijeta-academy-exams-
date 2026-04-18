const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./mock_test.db');

db.run("INSERT INTO exams (exam_name, duration_minutes, total_questions) VALUES ('Test Exam', 30, 3)", function(err) {
  if(err) console.log('Error:', err);
  else console.log('Exam added with ID:', this.lastID);
  db.close();
});