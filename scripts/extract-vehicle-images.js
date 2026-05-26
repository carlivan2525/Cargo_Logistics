/**
 * extract-vehicle-images.js
 *
 * Reads every vehicle document that has a Base64 image stored in MongoDB,
 * decodes it, and writes the result as a PNG file to:
 *   <project-root>/extracted-vehicle-images/<vehicleId>_<plate>.png
 *
 * Run with:  node scripts/extract-vehicle-images.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');
const Vehicle  = require('../models/Vehicle');

const OUTPUT_DIR = path.join(__dirname, '..', 'extracted-vehicle-images');

async function main() {
  // ── Connect ──────────────────────────────────────────────────────────────
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  // ── Fetch vehicles that actually have an image ────────────────────────────
  const vehicles = await Vehicle.find({ image: { $nin: [null, ''] } }).lean();
  console.log(`Found ${vehicles.length} vehicle(s) with stored images.\n`);

  if (vehicles.length === 0) {
    console.log('Nothing to extract. Exiting.');
    await mongoose.disconnect();
    return;
  }

  // ── Ensure output directory exists ───────────────────────────────────────
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output folder: ${OUTPUT_DIR}\n`);
  }

  // ── Extract each image ────────────────────────────────────────────────────
  let saved = 0;
  let skipped = 0;

  for (const vehicle of vehicles) {
    const raw = vehicle.image; // e.g. "data:image/png;base64,iVBOR..."

    // Strip the data-URL prefix if present, then decode
    const base64Data = raw.includes(',') ? raw.split(',')[1] : raw;

    if (!base64Data) {
      console.warn(`  [SKIP] ${vehicle.vehicleId} — image field is empty after stripping prefix.`);
      skipped++;
      continue;
    }

    // Detect extension from the data-URL mime type (fallback to png)
    let ext = 'png';
    const mimeMatch = raw.match(/^data:image\/(\w+);base64,/);
    if (mimeMatch) ext = mimeMatch[1] === 'jpeg' ? 'jpg' : mimeMatch[1];

    // Sanitise plate for use in filename (remove slashes, spaces, etc.)
    const safePlate = (vehicle.plate || 'unknown').replace(/[^a-zA-Z0-9-]/g, '_');
    const filename  = `${vehicle.vehicleId}_${safePlate}.${ext}`;
    const filepath  = path.join(OUTPUT_DIR, filename);

    try {
      fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
      console.log(`  [OK]   ${filename}  (${vehicle.name})`);
      saved++;
    } catch (err) {
      console.error(`  [ERR]  ${vehicle.vehicleId} — ${err.message}`);
      skipped++;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\nDone. ${saved} image(s) saved to: ${OUTPUT_DIR}`);
  if (skipped > 0) console.log(`       ${skipped} vehicle(s) skipped (see warnings above).`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
