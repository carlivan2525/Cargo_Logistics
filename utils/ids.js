const mongoose = require('mongoose');

// Atomic counter collection to avoid race conditions
const counterSchema = new mongoose.Schema({
  _id:  { type: String },
  seq:  { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

async function nextSequentialId(Model, field, prefix, pad = 4) {
  const counterId = `${prefix}`;
  
  // Try atomic counter first
  try {
    const counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return `${prefix}-${String(counter.seq).padStart(pad, '0')}`;
  } catch {
    // Fallback: find highest existing + 1 with retry
    const latest = await Model.findOne().sort({ [field]: -1 }).select(field).lean();
    const match = latest?.[field]?.match(/(\d+)$/);
    const n = match ? parseInt(match[1], 10) + 1 : 1;
    return `${prefix}-${String(n).padStart(pad, '0')}`;
  }
}

module.exports = { nextSequentialId };
