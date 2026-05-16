const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test Route
app.get('/', (req, res) => {
    res.send('CarGo Backend is running perfectly!');
});

// Connect to MongoDB & Start Server
mongoose.connect(process.env.MONGO_URI || '')
    .then(() => {
        console.log('MongoDB Connected!');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('Database connection error:', err);
        // Start server anyway even if DB connection fails initially
        app.listen(PORT, () => console.log(`Server running on port ${PORT} (DB Disconnected)`));
    });