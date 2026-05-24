require('dotenv').config();
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
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const col of COLLECTIONS) {
    try {
      const result = await mongoose.connection.collection(col).deleteMany({});
      console.log(`✓ ${col}: deleted ${result.deletedCount} documents`);
    } catch (err) {
      console.log(`✗ ${col}: ${err.message}`);
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
}

cleanup().catch(err => { console.error(err); process.exit(1); });
