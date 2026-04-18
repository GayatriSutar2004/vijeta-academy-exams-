// Simple test to verify upload functionality works
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
    console.log("=== TESTING UPLOAD FUNCTIONALITY ===");
    
    try {
        // Create form data
        const form = new FormData();
        form.append('exam_name', 'Debug Test Exam');
        form.append('duration_minutes', '60');
        form.append('total_questions', '3');
        form.append('exam_type', 'NDA');
        form.append('file', fs.createReadStream('test-questions.txt'));
        
        console.log("Sending upload request...");
        
        const response = await fetch('http://localhost:3001/api/exams/add', {
            method: 'POST',
            body: form
        });
        
        const data = await response.json();
        console.log("Response status:", response.status);
        console.log("Response data:", data);
        
    } catch (error) {
        console.error("Upload failed:", error);
    }
}

testUpload();
