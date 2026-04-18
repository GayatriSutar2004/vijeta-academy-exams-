const fs = require('fs');

// Function to parse questions from Word document text
function parseQuestionsFromText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const questions = [];
  let currentQuestion = null;
  let options = [];
  let correctAnswer = null;
  
  for (let line of lines) {
    if (line.match(/^Question \d+:/i)) {
      // Save previous question if exists
      if (currentQuestion && options.length === 4 && correctAnswer !== null) {
        questions.push({
          question_text: currentQuestion,
          options: JSON.stringify(options),
          correct_answer: correctAnswer
        });
      }
      
      // Start new question
      currentQuestion = line.replace(/^Question \d+:\s*/i, '');
      options = [];
      correctAnswer = null;
    } else if (line.match(/^[A-D]\)/i)) {
      // Option line
      const optionText = line.replace(/^[A-D]\)\s*/i, '');
      options.push(optionText);
    } else if (line.match(/^Correct:/i)) {
      // Correct answer line
      const correctLetter = line.replace(/^Correct:\s*/i, '').toUpperCase();
      correctAnswer = ['A', 'B', 'C', 'D'].indexOf(correctLetter);
    }
  }
  
  // Save last question
  if (currentQuestion && options.length === 4 && correctAnswer !== null) {
    questions.push({
      question_text: currentQuestion,
      options: JSON.stringify(options),
      correct_answer: correctAnswer
    });
  }
  
  return questions;
}

// Test the function
const text = fs.readFileSync('../sample_exam.txt', 'utf8');
const questions = parseQuestionsFromText(text);
console.log('Parsed questions:', JSON.stringify(questions, null, 2));