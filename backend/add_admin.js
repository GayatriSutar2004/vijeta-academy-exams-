const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./mock_test.db');

const admin = {
  admin_name: 'Default Admin',
  email: 'admin@test.com',
  mobile_no: '1234567890',
  password_hash: '1234',
  academy_name: 'Test Academy',
  city: 'Test City',
  state: 'Test State'
};

db.run(`INSERT INTO admin (admin_name, email, mobile_no, password_hash, academy_name, city, state) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
  [admin.admin_name, admin.email, admin.mobile_no, admin.password_hash, admin.academy_name, admin.city, admin.state], 
  function(err) {
    if (err) {
      console.error(err.message);
    } else {
      console.log('Default admin added with ID:', this.lastID);
    }
    db.close();
  });