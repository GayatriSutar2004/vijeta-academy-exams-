const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./mock_test.db');

const questions = [
  {
    question_text: "What is 2+2?",
    options: JSON.stringify(["3", "4", "5", "6"]),
    correct_answer: 1
  },
  {
    question_text: "What is the capital of India?",
    options: JSON.stringify(["Delhi", "Mumbai", "Kolkata", "Chennai"]),
    correct_answer: 0
  },
  {
    question_text: "What is 5*5?",
    options: JSON.stringify(["20", "25", "30", "35"]),
    correct_answer: 1
  }
];

let inserted = 0;
questions.forEach((q, index) => {
  db.run("INSERT INTO questions (exam_id, question_text, options, correct_answer) VALUES (?, ?, ?, ?)",
    [1, q.question_text, q.options, q.correct_answer], function(err) {
    if(err) console.log('Error inserting question:', err);
    else {
      inserted++;
      if(inserted === questions.length) {
        console.log('All questions added');
        db.close();
      }
    }
  });
});