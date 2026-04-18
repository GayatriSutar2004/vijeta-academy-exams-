const path = require('path');
const fs = require('fs');

// Test locally first
const filePath = path.join(__dirname, 'NDA-A-2024.docx');

async function testUpload() {
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    return;
  }
  
  console.log('File size:', fs.statSync(filePath).size);
  
  const FormData = require('form-data');
  const form = new FormData();
  
  form.append('file', fs.createReadStream(filePath), {
    filename: 'NDA-A-2024.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  form.append('exam_name', 'NDA Test Upload');
  form.append('duration_minutes', '30');
  form.append('total_questions', '50');
  form.append('exam_type', 'NDA');
  form.append('target_batch_name', 'NDA-A');
  form.append('target_admission_year', '2024');
  form.append('exam_date', '2026-04-20');
  form.append('exam_time', '10:00');
  form.append('created_by', '1');
  
  console.log('Sending to API...');
  
  try {
    const res = await fetch('http://localhost:3001/api/exams/add', {
      method: 'POST',
      body: form
    });
    
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.log('Error:', err.message);
  }
  
  process.exit(0);
}

testUpload();