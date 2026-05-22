const mongoose = require('mongoose');

const freightRateSchema = new mongoose.Schema({
  route:       { type: String, required: true, unique: true }, // e.g. "Manila - Calamba"
  rateL300:    { type: Number, default: 0 },
  rateExpander:{ type: Number, default: 0 },
  rateTruck:   { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('FreightRate', freightRateSchema);
