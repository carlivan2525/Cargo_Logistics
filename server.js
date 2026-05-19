const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/partners',      require('./routes/partners'));
app.use('/api/vehicles',      require('./routes/vehicles'));
app.use('/api/loadtenders',   require('./routes/loadtenders'));
app.use('/api/shipments',     require('./routes/shipments'));
app.use('/api/invoices',      require('./routes/invoices'));
app.use('/api/transmissions', require('./routes/transmissions'));

app.get('/', (req, res) => res.send('CarGO Backend is running!'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected!');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('DB connection error:', err);
    app.listen(PORT, () => console.log(`Server running on port ${PORT} (DB Disconnected)`));
  });
