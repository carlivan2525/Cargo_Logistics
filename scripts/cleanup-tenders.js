require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const LoadTender = require('../models/LoadTender');
const Transmission = require('../models/Transmission');
const Shipment = require('../models/Shipment');

const KEEP_TENDERS = ['TND-0001', 'TND-0002'];
const KEEP_TRANSMISSIONS = ['TRX-0001', 'TRX-0002'];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const removed = await LoadTender.find({ tenderId: { $nin: KEEP_TENDERS } }, 'tenderId _id');
  const removedIds = removed.map((t) => t._id);

  const r1 = await LoadTender.deleteMany({ tenderId: { $nin: KEEP_TENDERS } });
  const r2 = await Transmission.deleteMany({ transmissionId: { $nin: KEEP_TRANSMISSIONS } });
  const r3 = removedIds.length
    ? await Shipment.deleteMany({ tender: { $in: removedIds } })
    : { deletedCount: 0 };

  const left = await LoadTender.find({}, 'tenderId shipmentId status').sort({ tenderId: 1 });

  console.log('Deleted tenders:', r1.deletedCount);
  console.log('Deleted transmissions:', r2.deletedCount);
  console.log('Deleted shipments (from removed tenders):', r3.deletedCount);
  console.log('Remaining:', left.map((t) => `${t.tenderId} (${t.shipmentId})`).join(', '));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
