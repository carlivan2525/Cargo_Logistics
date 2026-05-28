require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../db');
const Shipment = require('../models/Shipment');
const LoadTender = require('../models/LoadTender');

async function main() {
  await connectDB();
  console.log('Connected. Backfilling shipments.orderId ...\n');

  const cursor = Shipment.find({
    $or: [{ orderId: null }, { orderId: '' }, { orderId: { $exists: false } }],
  }).cursor();

  let scanned = 0;
  let updated = 0;
  let fromTender = 0;
  let fallbackShipmentId = 0;

  for await (const s of cursor) {
    scanned += 1;
    let nextOrderId = null;

    if (s.tender) {
      const tender = await LoadTender.findById(s.tender).select('orderId shipmentId').lean();
      nextOrderId = tender?.orderId || tender?.shipmentId || null;
      if (tender?.orderId) fromTender += 1;
    }

    if (!nextOrderId) {
      nextOrderId = s.shipmentId || null;
      if (nextOrderId) fallbackShipmentId += 1;
    }

    if (!nextOrderId) continue;

    await Shipment.updateOne({ _id: s._id }, { $set: { orderId: nextOrderId } });
    updated += 1;
  }

  console.log('Done.');
  console.log(`Scanned: ${scanned}`);
  console.log(`Updated: ${updated}`);
  console.log(`Source: from tender.orderId: ${fromTender}`);
  console.log(`Source: fallback to shipmentId: ${fallbackShipmentId}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

