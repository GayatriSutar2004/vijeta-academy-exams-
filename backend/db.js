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

const poolConfig = {
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    port: dbPort,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

if (useSSL) {
    poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(poolConfig);

pool.getConnection((err, connection) => {
    if (err) {
        console.error("MySQL connection error:", err.message);
    } else {
        console.log("Connected to MySQL database");
        connection.release();
    }
});

module.exports = pool.promise();
