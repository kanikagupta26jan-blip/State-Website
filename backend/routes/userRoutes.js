const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.post('/register', (req, res) => {
  const { role, name, email, password } = req.body;
  const query = 'INSERT INTO users (role, name, email, password) VALUES (?, ?, ?, ?)';

  db.query(query, [role, name, email, password], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error saving user: ' + err.message });
    }
    res.status(201).json({ message: 'User registered successfully' });
  });
});

module.exports = router;
