/**
 * clear-vehicle-images.js
 *
 * Removes the Base64 image string from every vehicle document in MongoDB,
 * setting the image field to null.
 *
 * Run with:  node scripts/clear-vehicle-images.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Vehicle  = require('../models/Vehicle');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const result = await Vehicle.updateMany(
    { image: { $nin: [null, ''] } },
    { $set: { image: null } }
  );

  console.log(`Done. ${result.modifiedCount} vehicle(s) cleared.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
