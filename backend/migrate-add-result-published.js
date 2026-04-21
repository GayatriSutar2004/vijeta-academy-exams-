const db = require('./db');

async function migrate() {
  console.log('=== Adding result_published column to exams table ===');
  
  try {
    // Add result_published column if it doesn't exist
    await db.query(`
      ALTER TABLE exams 
      ADD COLUMN result_published TINYINT(1) DEFAULT 0
    `);
    console.log('✓ Added result_published column');
    
    // Also update existing exams to have result_published = 1 so current results stay visible
    await db.query(`
      UPDATE exams SET result_published = 1 WHERE exam_id > 0
    `);
    console.log('✓ Updated existing exams to show results');
    
    console.log('\n=== Migration Complete ===');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ Column already exists');
      console.log('\n=== Migration Complete ===');
      process.exit(0);
    }
    console.error('Error:', error.message);
    process.exit(1);
  }
}

migrate();