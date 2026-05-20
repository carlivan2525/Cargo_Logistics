/**
 * Updates pickup/delivery on all Accepted tenders to today + 7 days (PH time).
 * Run: node scripts/refresh-accepted-dates.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const LoadTender = require('../models/LoadTender');
const { getPickupAndDeliveryDates } = require('../utils/dates');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const { pickupDate, deliveryDate } = getPickupAndDeliveryDates();

  const accepted = await LoadTender.updateMany(
    { status: 'Accepted' },
    { $set: { pickupDate, deliveryDate } }
  );

  const pending = await LoadTender.updateMany(
    { status: 'Pending' },
    { $set: { pickupDate: null, deliveryDate: null } }
  );

  console.log(`Accepted tenders updated: ${accepted.modifiedCount}`);
  console.log(`Pending tenders cleared dates: ${pending.modifiedCount}`);
  console.log(`Pickup: ${pickupDate.toISOString().slice(0, 10)}`);
  console.log(`Delivery: ${deliveryDate.toISOString().slice(0, 10)}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
