require('dotenv').config();
const connectDB = require('../db');
const mongoose = require('mongoose');

// Only wipe the collections explicitly requested by the user.
const COLLECTIONS = ['loadtenders', 'shipments', 'invoices', 'ledgers', 'transmissions'];

async function cleanup() {
  const args = new Set(process.argv.slice(2));
  const confirmed = args.has('--yes') || process.env.CONFIRM === 'YES';
  if (!confirmed) {
    console.log('Refusing to run without explicit confirmation.');
    console.log('Run: node scripts/cleanup-db.js --yes');
    console.log('Or:  set CONFIRM=YES && node scripts/cleanup-db.js');
    process.exit(1);
  }

  await connectDB();
  console.log('Connected. Cleaning collections...\n');

  for (const col of COLLECTIONS) {
    try {
      const before = await mongoose.connection.collection(col).countDocuments();
      const result = await mongoose.connection.collection(col).deleteMany({});
      const after = await mongoose.connection.collection(col).countDocuments();
      console.log(`✓ ${col}: ${result.deletedCount} deleted (before=${before}, after=${after})`);
    } catch (err) {
      console.log(`✗ ${col}: ${err.message}`);
    }
  }

  console.log('\nDone.');
  process.exit(0);
}

cleanup().catch(err => { console.error(err); process.exit(1); });
