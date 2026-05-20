require('dotenv').config();
const mongoose = require('mongoose');
const Transmission = require('../models/Transmission');
const LoadTender = require('../models/LoadTender');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const prefixes = [
    { prefix: 'TRX', Model: Transmission, field: 'transmissionId' },
    { prefix: 'TND', Model: LoadTender,   field: 'tenderId' },
  ];

  for (const { prefix, Model, field } of prefixes) {
    const latest = await Model.findOne().sort({ [field]: -1 }).select(field).lean();
    const match = latest?.[field]?.match(/(\d+)$/);
    const n = match ? parseInt(match[1], 10) : 0;
    await mongoose.connection.collection('counters').updateOne(
      { _id: prefix },
      { $set: { seq: n } },
      { upsert: true }
    );
    console.log(`${prefix} counter set to ${n}`);
  }

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => { console.error(err); process.exit(1); });
