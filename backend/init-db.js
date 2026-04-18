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

    console.log("Connected to database, creating tables...");

    const tables = [
        `CREATE TABLE IF NOT EXISTS admin (
          admin_id INT AUTO_INCREMENT PRIMARY KEY,
          admin_name VARCHAR(255),
          email VARCHAR(255) UNIQUE,
          mobile_no VARCHAR(20),
          password_hash VARCHAR(255),
          academy_name VARCHAR(255),
          city VARCHAR(255),
          state VARCHAR(255),
          account_status VARCHAR(20) DEFAULT 'Active'
        )`,
        `CREATE TABLE IF NOT EXISTS students (
          student_id INT AUTO_INCREMENT PRIMARY KEY,
          student_name VARCHAR(255),
          batch_name VARCHAR(255),
          admission_year INT,
          roll_no VARCHAR(50),
          mobile_no VARCHAR(20),
          email VARCHAR(255) UNIQUE,
          password_hash VARCHAR(255),
          city VARCHAR(255),
          state VARCHAR(255),
          college_name VARCHAR(255),
          admin_id INT,
          exam_type VARCHAR(50) DEFAULT 'NDA',
          account_status VARCHAR(20) DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE ON UPDATE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS exams (
          exam_id INT AUTO_INCREMENT PRIMARY KEY,
          exam_name VARCHAR(255),
          duration_minutes INT,
          total_questions INT,
          total_marks DECIMAL(10,2) DEFAULT 0,
          exam_type_id INT DEFAULT 1,
          exam_type VARCHAR(50),
          target_batch_name VARCHAR(50),
          target_admission_year INT,
          exam_date DATE,
          exam_time TIME,
          exam_status VARCHAR(20) DEFAULT 'Available',
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES admin(admin_id) ON DELETE SET NULL
        )`,
        `CREATE TABLE IF NOT EXISTS exam_students (
          exam_student_id INT AUTO_INCREMENT PRIMARY KEY,
          exam_id INT,
          student_id INT,
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE,
          FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
          UNIQUE KEY unique_exam_student (exam_id, student_id)
        )`,
        `CREATE TABLE IF NOT EXISTS questions (
          question_id INT AUTO_INCREMENT PRIMARY KEY,
          exam_type_id INT DEFAULT 1,
          subject_id INT DEFAULT 1,
          question_text TEXT,
          marks DECIMAL(5,2) DEFAULT 1.00,
          negative_marks DECIMAL(5,2) DEFAULT 0.00,
          difficulty_level VARCHAR(20) DEFAULT 'Medium',
          explanation_text TEXT,
          section_name VARCHAR(100) DEFAULT 'General',
          image_path VARCHAR(500) DEFAULT NULL,
          created_by INT,
          FOREIGN KEY (created_by) REFERENCES admin(admin_id) ON DELETE SET NULL
        )`,
        `CREATE TABLE IF NOT EXISTS question_options (
          option_id INT AUTO_INCREMENT PRIMARY KEY,
          question_id INT,
          option_label VARCHAR(5),
          option_text TEXT,
          is_correct TINYINT DEFAULT 0,
          FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS exam_questions (
          exam_question_id INT AUTO_INCREMENT PRIMARY KEY,
          exam_id INT,
          question_id INT,
          default_sequence INT,
          FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS exam_attempts (
          attempt_id INT AUTO_INCREMENT PRIMARY KEY,
          exam_id INT,
          student_id INT,
          start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          end_time TIMESTAMP NULL,
          submitted_at TIMESTAMP NULL,
          time_taken_seconds INT DEFAULT 0,
          time_limit_minutes INT,
          total_questions INT DEFAULT 0,
          total_marks DECIMAL(10,2) DEFAULT 0,
          attempt_status VARCHAR(20) DEFAULT 'In Progress',
          FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE,
          FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS student_responses (
          response_id INT AUTO_INCREMENT PRIMARY KEY,
          attempt_id INT,
          question_id INT,
          selected_answer INT,
          is_correct TINYINT DEFAULT 0,
          marks_obtained DECIMAL(5,2) DEFAULT 0,
          FOREIGN KEY (attempt_id) REFERENCES exam_attempts(attempt_id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS results (
          result_id INT AUTO_INCREMENT PRIMARY KEY,
          student_id INT,
          exam_id INT,
          question_id INT,
          selected_answer INT,
          is_correct BOOLEAN,
          FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE ON UPDATE CASCADE
        )`
    ];

    for (const sql of tables) {
        try {
            await conn.promise().query(sql);
            console.log("Table created");
        } catch (err) {
            if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log("Table already exists");
            } else {
                console.error("Error:", err.message);
            }
        }
    }

    console.log("All tables done!");

    try {
        const [admin] = await conn.promise().query("SELECT * FROM admin WHERE email = 'admin@vijeta.com'");
        if (admin.length === 0) {
            await conn.promise().query(
                "INSERT INTO admin (admin_name, email, mobile_no, password_hash, academy_name, city, state) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ["Admin", "admin@vijeta.com", "1234567890", "admin123", "Vijeta Foundation", "Ashta", "MH"]
            );
            console.log("Default admin created!");
        } else {
            console.log("Admin already exists");
        }
    } catch (err) {
        console.error("Error with admin:", err.message);
    }

    conn.end();
    process.exit(0);
});
