-- Updated Database Schema with CASCADE

-- Admin table
CREATE TABLE IF NOT EXISTS admin (
  admin_id INT AUTO_INCREMENT PRIMARY KEY,
  admin_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  mobile_no VARCHAR(20),
  password_hash VARCHAR(255),
  academy_name VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(255)
);

-- Students table with foreign key to admin
CREATE TABLE IF NOT EXISTS students (
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
  FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Exams table with foreign key to admin
CREATE TABLE IF NOT EXISTS exams (
  exam_id INT AUTO_INCREMENT PRIMARY KEY,
  exam_name VARCHAR(255),
  duration_minutes INT,
  total_questions INT,
  exam_type VARCHAR(50),
  admin_id INT,
  FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Questions table with foreign key to exams
CREATE TABLE IF NOT EXISTS questions (
  question_id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT,
  question_text TEXT,
  options JSON,
  correct_answer INT,
  FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Results table with foreign keys to students, exams, questions
CREATE TABLE IF NOT EXISTS results (
  result_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT,
  exam_id INT,
  question_id INT,
  selected_answer INT,
  is_correct BOOLEAN,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE ON UPDATE CASCADE
);