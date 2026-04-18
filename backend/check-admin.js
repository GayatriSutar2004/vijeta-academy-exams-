const db = require('./db');

async function checkAdmin() {
    try {
        console.log('Checking existing admin users...');
        const [results] = await db.execute('SELECT * FROM admin');
        console.log('Found admin users:', results);
        
        if (results.length === 0) {
            console.log('No admin users found. Creating default admin...');
            const [result] = await db.execute(
                `INSERT INTO admin (admin_name, email, mobile_no, password_hash, academy_name, city, state) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['Admin', 'admin@vijeta.com', '1234567890', 'admin123', 'Vijeta Foundation', 'Ashta', 'MH']
            );
            console.log('Default admin created with ID:', result.insertId);
            console.log('Login credentials:');
            console.log('Email: admin@vijeta.com');
            console.log('Password: admin123');
        } else {
            console.log('Existing admin credentials:');
            results.forEach(admin => {
                console.log(`Email: ${admin.email}, Password: ${admin.password_hash}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAdmin();
