require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User        = require('./models/User');
const Partner     = require('./models/Partner');
const Vehicle     = require('./models/Vehicle');
const LoadTender  = require('./models/LoadTender');
const Transmission = require('./models/Transmission');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear
  await Promise.all([
    Partner.deleteMany({}),
    Vehicle.deleteMany({}),
    LoadTender.deleteMany({}),
    Transmission.deleteMany({}),
  ]);

  // Partners
  const partners = await Partner.insertMany([
    { partnerId: 'PTR-001', name: 'Surplus',  type: 'Retailer',     isaId: 'SURPLUS',  protocol: 'AS2', status: 'Active', ediDocs: ['204','990','214','210'] },
    { partnerId: 'PTR-002', name: 'NewForge', type: 'Manufacturer', isaId: 'NEWFORGE', protocol: 'AS2', status: 'Active', ediDocs: ['204','990','214','210'] },
  ]);
  console.log('Partners seeded');

  // Fleet
  await Vehicle.insertMany([
    { vehicleId: 'VH-001', name: 'L300 Van',     type: 'L300',     plate: 'ABC 1234', capacity: '1.5T', status: 'Available' },
    { vehicleId: 'VH-002', name: 'L300 Van',     type: 'L300',     plate: 'DEF 5678', capacity: '1.5T', status: 'Available' },
    { vehicleId: 'VH-003', name: 'Truck (10W)',  type: 'Truck',    plate: 'GHI 9012', capacity: '10T',  status: 'Available' },
    { vehicleId: 'VH-004', name: 'Truck (6W)',   type: 'Truck',    plate: 'JKL 3456', capacity: '6T',   status: 'Available' },
    { vehicleId: 'VH-005', name: 'Expander Van', type: 'Expander', plate: 'MNO 7890', capacity: '2T',   status: 'Available' },
  ]);
  console.log('Vehicles seeded');

  // Sample Load Tenders (Pending — hindi pa approved, hindi pa lalabas sa Shipments)
  const surplus  = partners[0]._id;
  const newforge = partners[1]._id;

  const tenders = await LoadTender.insertMany([
    {
      tenderId:     'TND-0001',
      ediRef:       'TRX-0001',
      partner:      surplus,
      shipmentId:   'SHP-0519-001',
      orderId:      'ORD-679865',
      route:        'Manila - Quezon City',
      carrierId:    '2GO',
      carrierName:  '2GO Freight',
      carrierScac:  'TGOF',
      pickupDate:   new Date('2026-05-21'),
      deliveryDate: new Date('2026-05-24'),
      originAddress: {
        locationName:  'Main Warehouse',
        region:        'NCR - Metro Manila',
        city:          'Manila',
        zipCode:       '1000',
        contactPerson: 'Juan dela Cruz',
        contactPhone:  '09171234567',
      },
      weight:       '4T',
      commodity:    'General Merchandise',
      status:       'Pending',
    },
    {
      tenderId:     'TND-0002',
      ediRef:       'TRX-0002',
      partner:      newforge,
      shipmentId:   'SHP-0519-002',
      orderId:      'ORD-635233',
      route:        'Manila - Cebu',
      carrierId:    '',
      carrierName:  '',
      carrierScac:  '',
      pickupDate:   new Date('2026-05-22'),
      deliveryDate: new Date('2026-05-26'),
      originAddress: {
        locationName:  'Main Warehouse',
        region:        'NCR - Metro Manila',
        city:          'Manila',
        zipCode:       '1000',
        contactPerson: '',
        contactPhone:  '',
      },
      weight:       '1.2T',
      commodity:    'Auto Parts',
      status:       'Pending',
    },
  ]);
  console.log('Load Tenders seeded');

  // Log inbound 204 transmissions for each tender
  await Transmission.insertMany([
    {
      transmissionId: 'TRX-0001',
      ediCode:   '204',
      label:     'Load Tender',
      direction: 'IN',
      partner:   surplus,
      status:    'Received',
      isaSegment: 'ISA*00*...*ZZ*SURPLUS*20260519*0900*^*00501*000000001*0*P*>',
    },
    {
      transmissionId: 'TRX-0002',
      ediCode:   '204',
      label:     'Load Tender',
      direction: 'IN',
      partner:   newforge,
      status:    'Received',
      isaSegment: 'ISA*00*...*ZZ*NEWFORGE*20260519*0930*^*00501*000000002*0*P*>',
    },
  ]);
  console.log('Transmissions seeded');

  // Admin user
  const exists = await User.findOne({ username: 'admin' });
  if (!exists) {
    await new User({ username: 'admin', password: await bcrypt.hash('admin123', 10) }).save();
    console.log('Admin user created — username: admin / password: admin123');
  } else {
    console.log('Admin user already exists, skipping');
  }

  await mongoose.disconnect();
  console.log('Seed complete');
}

seed().catch(err => { console.error(err); process.exit(1); });
