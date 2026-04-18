const express = require('express');
const router = express.Router();
const db = require('../db'); // MySQL database connection

// Get all admins
router.get('/', async (req, res) => {
    try {
        const [results] = await db.execute('SELECT * FROM admin');
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new admin
router.post('/add', async (req, res) => {
    const { admin_name, email, mobile_no, password_hash, academy_name, city, state } = req.body;
    try {
        const [result] = await db.execute(
            `INSERT INTO admin 
            (admin_name, email, mobile_no, password_hash, academy_name, city, state) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [admin_name, email, mobile_no, password_hash, academy_name, city, state]
        );
        res.json({ message: 'Admin added successfully', admin_id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [results] = await db.execute(
            'SELECT * FROM admin WHERE email = ? AND password_hash = ?',
            [email, password]
        );
        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        res.json({ message: 'Login successful', admin: results[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update admin profile
router.put('/update/:id', async (req, res) => {
    const id = req.params.id;
    const { admin_name, email, mobile_no } = req.body;
    
    if(!admin_name || !email || !mobile_no) {
        return res.status(400).json({ message: "All fields required!" });
    }
    
    try {
        await db.execute(
            'UPDATE admin SET admin_name=?, email=?, mobile_no=? WHERE admin_id=?',
            [admin_name, email, mobile_no, id]
        );
        res.json({ message: 'Profile updated successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Change admin password
router.put('/password/:id', async (req, res) => {
    const id = req.params.id;
    const { oldPassword, newPassword } = req.body;
    
    if(!oldPassword || !newPassword) {
        return res.status(400).json({ message: "Both passwords required!" });
    }
    
    try {
        // First verify old password
        const [results] = await db.execute(
            'SELECT * FROM admin WHERE admin_id = ? AND password_hash = ?',
            [id, oldPassword]
        );
        
        if (results.length === 0) {
            return res.status(401).json({ error: 'Old password incorrect' });
        }
        
        // Update password
        await db.execute(
            'UPDATE admin SET password_hash = ? WHERE admin_id = ?',
            [newPassword, id]
        );
        res.json({ message: 'Password changed successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;