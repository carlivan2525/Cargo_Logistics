require('dotenv').config();
const connectDB = require('../db');
const mongoose = require('mongoose');

const COLLECTIONS = [
  'transmissions',
  'shipments',
  'loadtenders',
  'ledgers',
  'invoices',
  'edilogs',
];

async function cleanup() {
  await connectDB();
  console.log('Connected. Cleaning collections...\n');

  for (const col of COLLECTIONS) {
    try {
      const result = await mongoose.connection.collection(col).deleteMany({});
      console.log(`✓ ${col}: ${result.deletedCount} documents deleted`);
    } catch (err) {
      console.log(`✗ ${col}: ${err.message}`);
    }
  }

  console.log('\nDone.');
  process.exit(0);
}

cleanup().catch(err => { console.error(err); process.exit(1); });
