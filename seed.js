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

  // Fleet — realistic PH logistics vehicles
  await Vehicle.insertMany([
    // Small parcels / docs (kg range)
    { vehicleId: 'VH-001', name: 'Motorcycle (NMAX)',   type: 'Motorcycle',       plate: 'ABC 1234', capacity: '20kg',   status: 'Available' },
    { vehicleId: 'VH-002', name: 'Motorcycle (PCX)',    type: 'Motorcycle',       plate: 'ABC 5678', capacity: '20kg',   status: 'Available' },
    { vehicleId: 'VH-003', name: 'Sedan (Toyota Vios)', type: 'Sedan',            plate: 'BAA 1111', capacity: '200kg',  status: 'Available' },
    { vehicleId: 'VH-004', name: 'SUV (Fortuner)',      type: 'SUV',              plate: 'BAB 2222', capacity: '400kg',  status: 'Available' },
    // Light delivery (up to 1T)
    { vehicleId: 'VH-005', name: 'L300 Van',            type: 'L300',             plate: 'DEF 1234', capacity: '800kg',  status: 'Available' },
    { vehicleId: 'VH-006', name: 'L300 Van',            type: 'L300',             plate: 'DEF 5678', capacity: '800kg',  status: 'Available' },
    { vehicleId: 'VH-007', name: 'Closed Van (Hiace)',  type: 'Closed Van',       plate: 'GHI 1234', capacity: '1000kg',  status: 'Available' },
    { vehicleId: 'VH-008', name: 'Closed Van (Hiace)',  type: 'Closed Van',       plate: 'GHI 5678', capacity: '1000kg',  status: 'Available' },
    // Medium freight (1T–4T)
    { vehicleId: 'VH-009', name: 'Elf Truck (Isuzu)',   type: 'Elf Truck',        plate: 'JKL 1234', capacity: '2000kg',  status: 'Available' },
    { vehicleId: 'VH-010', name: 'Elf Truck (Isuzu)',   type: 'Elf Truck',        plate: 'JKL 5678', capacity: '2000kg',  status: 'Available' },
    { vehicleId: 'VH-011', name: 'Wing Van (4W)',        type: 'Wing Van',         plate: 'MNO 1234', capacity: '3000kg',  status: 'Available' },
    // Heavy freight (6T–15T)
    { vehicleId: 'VH-012', name: '6-Wheeler Truck',     type: '6-Wheeler Truck',  plate: 'PQR 1234', capacity: '6000kg',  status: 'Available' },
    { vehicleId: 'VH-013', name: '6-Wheeler Truck',     type: '6-Wheeler Truck',  plate: 'PQR 5678', capacity: '6000kg',  status: 'Available' },
    { vehicleId: 'VH-014', name: '10-Wheeler Truck',    type: '10-Wheeler Truck', plate: 'STU 1234', capacity: '10000kg', status: 'Available' },
    { vehicleId: 'VH-015', name: '10-Wheeler Truck',    type: '10-Wheeler Truck', plate: 'STU 5678', capacity: '15000kg', status: 'Available' },
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
