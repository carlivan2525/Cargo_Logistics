require('dotenv').config();
const mongoose = require('mongoose');
const Partner = require('../models/Partner');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const partner = await Partner.findOne({ name: /bulldog exchange/i });
  if (!partner) return console.log('NOT FOUND');
  console.log('name:', partner.name);
  console.log('endpoints:', JSON.stringify(partner.endpoints, null, 2));
  process.exit(0);
}).catch(err => { console.error(err.message); process.exit(1); });
