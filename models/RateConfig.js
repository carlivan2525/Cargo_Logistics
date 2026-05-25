const mongoose = require('mongoose');

const rateConfigSchema = new mongoose.Schema({
  ratePerKm: { type: mongoose.Schema.Types.Mixed, default: {} },
  minCharge:  { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('RateConfig', rateConfigSchema);
