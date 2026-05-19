const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('CarGO Backend is running!'));

app.get('/api/health', async (req, res) => {
  const checks = {
    mongoUri: !!process.env.MONGO_URI,
    jwtSecret: !!process.env.JWT_SECRET,
    dbConnected: mongoose.connection.readyState === 1,
  };
  try {
    await connectDB();
    checks.dbConnected = true;
    res.json({ ok: true, ...checks });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err.message,
      ...checks,
      vercelEnv: process.env.VERCEL_ENV || null,
      hint: !checks.mongoUri
        ? 'Set MONGO_URI and JWT_SECRET on your Vercel project, enable Production, redeploy from repo root (not client/ only).'
        : undefined,
    });
  }
});

// Ensure DB is connected before API routes (required on Vercel serverless)
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    res.status(503).json({ message: 'Database unavailable. Check MONGO_URI on Vercel.' });
  }
});

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/partners',      require('./routes/partners'));
app.use('/api/vehicles',      require('./routes/vehicles'));
app.use('/api/loadtenders',   require('./routes/loadtenders'));
app.use('/api/shipments',     require('./routes/shipments'));
app.use('/api/invoices',      require('./routes/invoices'));
app.use('/api/transmissions', require('./routes/transmissions'));

// Local development: start listening
if (require.main === module) {
  connectDB()
    .then(() => {
      console.log('MongoDB Connected!');
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
      console.error('DB connection error:', err);
      app.listen(PORT, () => console.log(`Server running on port ${PORT} (DB Disconnected)`));
    });
}

module.exports = app;
