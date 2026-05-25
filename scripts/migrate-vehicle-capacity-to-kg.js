require('dotenv').config();
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  const vehicles = await Vehicle.find({});
  let updated = 0;

  for (const v of vehicles) {
    const s = String(v.capacity || '').trim();

    // Convert tons → kg: "1T" → "1000kg", "1.5T" → "1500kg"
    const tonsMatch = s.match(/^([\d.]+)\s*T(ons?)?$/i);
    if (tonsMatch) {
      const kg = parseFloat(tonsMatch[1]) * 1000;
      v.capacity = `${kg}kg`;
      await v.save();
      console.log(`  ${v.vehicleId} (${v.name}): ${s} → ${v.capacity}`);
      updated++;
    }
  }

  console.log(`\nDone — ${updated} vehicle(s) updated.`);
  await mongoose.disconnect();
}

migrate().catch(err => { console.error(err); process.exit(1); });
