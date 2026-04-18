const db = require('./db');

async function addAdmin() {
  try {
    // Check if admin already exists
    const [existingAdmin] = await db.execute(
      'SELECT * FROM admin WHERE email = ?',
      ['admin@test.com']
    );
    
    if (existingAdmin.length > 0) {
      console.log('Admin user already exists!');
      return;
    }
    
    // Add default admin
    const [result] = await db.execute(
      `INSERT INTO admin (admin_name, email, mobile_no, password_hash, academy_name, city, state) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['Default Admin', 'admin@test.com', '1234567890', '1234', 'Test Academy', 'Test City', 'Test State']
    );
    
    console.log('Admin user added successfully! Admin ID:', result.insertId);
    
    // Add default student
    const [studentResult] = await db.execute(
      `INSERT INTO students (student_name, batch_name, admission_year, roll_no, mobile_no, email, password_hash, city, state, college_name) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Test Student', 'Batch 1', 2023, '123', '9876543210', 'student@test.com', '1234', 'Test City', 'Test State', 'Test College']
    );
    
    console.log('Student user added successfully! Student ID:', studentResult.insertId);
    
  } catch (error) {
    console.error('Error adding admin:', error);
  } finally {
    process.exit(0);
  }
}

addAdmin();
