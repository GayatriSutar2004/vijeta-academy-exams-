const FormData = require('form-data');
const fs = require('fs');
const http = require('http');

// Create form data
const form = new FormData();
form.append('exam_name', 'Test Exam');
form.append('duration_minutes', '60');
form.append('total_questions', '3');
form.append('exam_type', 'NDA');
form.append('file', fs.createReadStream('test-questions.txt'));

// Make the request
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/exams/add',
  method: 'POST',
  headers: form.getHeaders()
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

form.pipe(req);

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});
