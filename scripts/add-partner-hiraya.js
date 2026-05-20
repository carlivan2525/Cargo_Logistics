require('dotenv').config();
const mongoose = require('mongoose');
const Partner = require('../models/Partner');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const count = await Partner.countDocuments();
  const partnerId = `PTR-${String(count + 1).padStart(3, '0')}`;

  const existing = await Partner.findOne({ name: 'Hiraya' });
  if (existing) {
    console.log('Partner Hiraya already exists:', existing.partnerId);
    return process.exit(0);
  }

  const partner = await Partner.create({
    partnerId,
    name:     'Hiraya',
    type:     'Retailer',
    isaId:    'HIRAYA',
    protocol: 'AS2',
    status:   'Active',
    ediDocs:  ['204', '990', '214', '210'],
  });

  console.log('Partner created:', partner.partnerId, '-', partner.name);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
