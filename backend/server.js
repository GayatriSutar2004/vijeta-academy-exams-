const express = require('express');
const cors = require('cors');

const app = express();

// Use PORT from environment (Render sets this), default to 5000
const PORT = process.env.PORT || 5000;

console.log('========================================');
console.log('Starting Vijeta API Server...');
console.log('PORT:', PORT);
console.log('========================================');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Load and register routes
try {
  console.log('Loading database module...');
  const db = require('./db');
  console.log('Loading routes...');
  
  app.use('/api/students', require('./routes/students'));
  app.use('/api/exams', require('./routes/exams'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/results', require('./routes/results'));
  app.use('/api/student-exams', require('./routes/student-exams'));
  app.use('/api/exam-attempts', require('./routes/exam-attempts'));
  app.use('/api/admin-results', require('./routes/admin-results'));
  
  console.log('All routes loaded successfully');
} catch (error) {
  console.error('Error loading routes:', error.message);
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('========================================');
  console.log('✅ Vijeta API Started Successfully');
  console.log('✅ Running on port:', PORT);
  console.log('✅ Base URL: http://localhost:' + PORT);
  console.log('========================================');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});