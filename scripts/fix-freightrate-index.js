require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const col = db.collection('freightrates');

  // Drop all indexes except _id, then let Mongoose recreate the correct one
  const indexes = await col.indexes();
  console.log('Current indexes:', indexes.map(i => i.name));

  for (const idx of indexes) {
    if (idx.name !== '_id_') {
      await col.dropIndex(idx.name);
      console.log('Dropped index:', idx.name);
    }
  }

  // Also clear any bad documents with null route
  const deleted = await col.deleteMany({ route: null });
  console.log('Deleted bad docs:', deleted.deletedCount);

  console.log('Done. Restart your server.');
  process.exit(0);
}).catch(err => { console.error(err.message); process.exit(1); });
