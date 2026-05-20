/** Clear pickup/delivery on all Pending tenders (old DB cleanup). */
require('dotenv').config();
const mongoose = require('mongoose');
const LoadTender = require('../models/LoadTender');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await LoadTender.updateMany(
    { status: 'Pending' },
    { $set: { pickupDate: null, deliveryDate: null } }
  );
  console.log(`Cleared dates on ${result.modifiedCount} pending tender(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
