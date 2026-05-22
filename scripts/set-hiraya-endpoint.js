require('dotenv').config();
const mongoose = require('mongoose');
const Partner = require('../models/Partner');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const result = await Partner.findOneAndUpdate(
    { name: 'Hiraya' },
    { apiEndpoint: 'https://grip-faceplate-alienate.ngrok-free.dev/api/edi/send-freight-invoice' },
    { new: true }
  );

  if (!result) {
    console.log('Partner Hiraya not found.');
  } else {
    console.log(`Updated ${result.name} apiEndpoint:`, result.apiEndpoint);
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
