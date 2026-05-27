require('dotenv').config();
const mongoose = require('mongoose');
const Partner = require('../models/Partner');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const count = await Partner.countDocuments();

  const partner = await Partner.findOneAndUpdate(
    { name: /bulldog exchange/i },
    {
      partnerId:   `PTR-${String(count + 1).padStart(4, '0')}`,
      name:        'Bulldog Exchange',
      type:        'Retailer',
      isaId:       'BULLDOG',
      protocol:    'AS2',
      status:      'Active',
      ediDocs:     ['204', '990', '214', '210',],
      apiEndpoint: '',
      endpoints: {
        edi990:  process.env.EDI_BULLDOG_990,
        edi214:  process.env.EDI_BULLDOG_214,
        edi210:  process.env.EDI_BULLDOG_210,
        invoice: process.env.EDI_BULLDOG_210,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  console.log('Done:', partner.name, '|', partner.partnerId);
  console.log('endpoints:', JSON.stringify(partner.endpoints, null, 2));
  process.exit(0);
}).catch(err => { console.error(err.message); process.exit(1); });
