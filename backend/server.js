const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json()); // JSON parsing
app.use(express.urlencoded({ extended: true })); // URL-encoded parsing

// Database connection
const db = require('./db');
console.log("DB required:", typeof db);

// Routes
const studentRoutes = require('./routes/students');
const examRoutes = require('./routes/exams'); // exams route
const adminRoutes = require('./routes/admin');
const resultRoutes = require('./routes/results');
const studentExamRoutes = require('./routes/student-exams');
const examAttemptsRoutes = require('./routes/exam-attempts');
const adminResultsRoutes = require('./routes/admin-results');

app.use('/api/students', studentRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/student-exams', studentExamRoutes);
app.use('/api/exam-attempts', examAttemptsRoutes);
app.use('/api/admin-results', adminResultsRoutes);

// Root route - API is running
app.get('/', (req, res) => {
  res.json({ 
    message: 'Vijeta API is running',
    version: '1.0.0',
    endpoints: [
      '/api/students',
      '/api/exams',
      '/api/admin',
      '/api/results',
      '/api/student-exams',
      '/api/exam-attempts',
      '/api/admin-results'
    ]
  });
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// ✅ Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log("Server started successfully");
});