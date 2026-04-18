const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const filePath = path.join(__dirname, 'NDA-A-2024.docx');

if (!fs.existsSync(filePath)) {
  console.log('File not found:', filePath);
  process.exit(1);
}

console.log('File exists:', fs.statSync(filePath).size, 'bytes');

const form = new FormData();
form.append('file', fs.createReadStream(filePath));
form.append('exam_name', 'Test Upload');
form.append('exam_type', 'NDA');
form.append('target_batch_name', 'NDA-A');
form.append('target_admission_year', '2024');
form.append('duration_minutes', '30');

console.log('Form created, sending...');

fetch('https://vijeta-api.onrender.com/api/exams/add', {
  method: 'POST',
  body: form
})
.then(res => res.text())
.then(text => {
  console.log('Response:', text);
  process.exit(0);
})
.catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});