const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

console.log('Testing MySQL connection...');
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER);
console.log('Database:', process.env.DB_NAME);

// Test basic connection without pool
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mock_test_db',
    connectTimeout: 10000,
    acquireTimeout: 10000
});

connection.connect((err) => {
    if (err) {
        console.error('Connection failed:', {
            code: err.code,
            errno: err.errno,
            sqlMessage: err.sqlMessage,
            sqlState: err.sqlState
        });
        
        // Provide specific solutions
        if (err.code === 'ETIMEDOUT') {
            console.log('\n=== SOLUTION ===');
            console.log('1. Check if MySQL service is running:');
            console.log('   - Windows: services.msc → MySQL80');
            console.log('   - Or: net start mysql');
            console.log('2. Check MySQL configuration:');
            console.log('   - Port 3306 should be open');
            console.log('   - Allow localhost connections');
            console.log('3. Try restarting MySQL service');
        }
        
        process.exit(1);
    } else {
        console.log('✅ MySQL connection successful!');
        connection.end();
        process.exit(0);
    }
});
