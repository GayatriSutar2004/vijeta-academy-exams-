const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./mock_test.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

const sql = fs.readFileSync('./schema.sql', 'utf8');

db.exec(sql, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Database initialized successfully.');
    }
    db.close();
});