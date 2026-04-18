const http = require('http');

async function testFinalAPI() {
    try {
        console.log('=== FINAL API TEST ===');
        
        const response = await fetch('http://localhost:3001/api/admin-results');
        const data = await response.json();
        
        console.log('API Status:', response.status);
        console.log('Response:', data);
        
        process.exit(0);
        
    } catch (error) {
        console.error('Final API test error:', error);
        process.exit(1);
    }
}

testFinalAPI();
