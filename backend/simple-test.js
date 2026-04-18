const http = require('http');

async function simpleTest() {
    try {
        console.log('=== SIMPLE API TEST ===');
        
        // Test basic response
        const response = await http.get({
            hostname: 'localhost',
            port: 3001,
            path: '/api/admin-results',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.statusCode);
        console.log('Response headers:', response.headers);
        
        const data = '';
        response.on('data', (chunk) => {
            data += chunk;
        });
        
        response.on('end', () => {
            console.log('Response data (first 200 chars):', data.substring(0, 200));
            console.log('Is JSON?', data.trim().startsWith('{'));
            console.log('Is HTML?', data.trim().startsWith('<'));
        });
        
    } catch (error) {
        console.error('Simple test error:', error);
    }
}

simpleTest();
