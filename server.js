const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test Route
app.get('/', (req, res) => {
    res.send('CarGo Backend is running perfectly!');
});

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ message: 'Username already exists' });

        const hashed = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashed });
        await user.save();
        res.json({ message: 'User created successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user._id, username },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        res.json({ token, username });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Connect to MongoDB & Start Server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected!');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('Database connection error:', err);
        app.listen(PORT, () => console.log(`Server running on port ${PORT} (DB Disconnected)`));
    });
