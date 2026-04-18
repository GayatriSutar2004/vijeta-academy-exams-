const db = require('./db');

async function updateSchema() {
  try {
    console.log('Updating MySQL schema...');
    
    // Add exam_type column to exams table
    await db.execute('ALTER TABLE exams ADD COLUMN exam_type VARCHAR(50)');
    console.log('Added exam_type column to exams table');
    
    // Add account_status column to admin table
    await db.execute('ALTER TABLE admin ADD COLUMN account_status VARCHAR(20) DEFAULT "Active"');
    console.log('Added account_status column to admin table');
    
    // Add account_status column to students table
    await db.execute('ALTER TABLE students ADD COLUMN account_status VARCHAR(20) DEFAULT "Active"');
    console.log('Added account_status column to students table');
    
    // Add created_at column to admin table
    await db.execute('ALTER TABLE admin ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    console.log('Added created_at column to admin table');
    
    // Add created_at column to students table
    await db.execute('ALTER TABLE students ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    console.log('Added created_at column to students table');
    
    console.log('Schema update completed successfully!');
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists, skipping...');
    } else {
      console.error('Error updating schema:', error);
    }
  } finally {
    process.exit(0);
  }
}

updateSchema();
