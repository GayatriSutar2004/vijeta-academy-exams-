const http = require('http');

async function testAPIs() {
    console.log('=== TESTING BACKEND APIS ===');
    
    try {
        // Test admin results endpoint
        console.log('\n1. Testing Admin Results API...');
        const adminResponse = await fetch('http://localhost:3001/api/admin-results');
        const adminData = await adminResponse.json();
        console.log('Admin Results Status:', adminResponse.status);
        console.log('Results Count:', adminData.length);
        
        // Test student exams endpoint
        console.log('\n2. Testing Student Exams API...');
        const studentResponse = await fetch('http://localhost:3001/api/student-exams/available/1');
        const studentData = await studentResponse.json();
        console.log('Student Exams Status:', studentResponse.status);
        console.log('Available Exams:', studentData.available_exams?.length || 0);
        
        // Test exam questions endpoint
        console.log('\n3. Testing Exam Questions API...');
        const examResponse = await fetch('http://localhost:3001/api/exams/1/questions');
        const examData = await examResponse.json();
        console.log('Exam Questions Status:', examResponse.status);
        console.log('Questions Count:', examData.length);
        
        console.log('\n=== API TESTING COMPLETED ===');
        process.exit(0);
        
    } catch (error) {
        console.error('API Testing Error:', error);
        process.exit(1);
    }
}

testAPIs();
