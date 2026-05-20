/** Set all vehicles back to Available (one-time DB cleanup). */
require('dotenv').config();
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await Vehicle.updateMany({}, { $set: { status: 'Available' } });
  console.log(`Reset ${result.modifiedCount} vehicle(s) to Available.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
