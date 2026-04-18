const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'mock_test_db';
const dbPort = process.env.DB_PORT || 3306;
const useSSL = process.env.DB_SSL_MODE === 'REQUIRED';

const connOptions = {
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    port: dbPort,
    database: dbName
};

if (useSSL) {
    connOptions.ssl = { rejectUnauthorized: false };
}

const conn = mysql.createConnection(connOptions);

conn.connect(async (err) => {
    if (err) {
        console.error("Connection error:", err.message);
        process.exit(1);
    }

    console.log("Connected to database...");
    
    try {
        const [columns] = await conn.promise().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'questions' AND COLUMN_NAME = 'image_path'
        `, [dbName]);
        
        if (columns.length === 0) {
            await conn.promise().query(`
                ALTER TABLE questions ADD COLUMN image_path VARCHAR(500) DEFAULT NULL
            `);
            console.log("Added image_path column to questions table");
        } else {
            console.log("image_path column already exists");
        }
    } catch (err) {
        console.error("Error:", err.message);
    }

    conn.end();
    process.exit(0);
});
