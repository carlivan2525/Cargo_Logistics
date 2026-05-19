const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true, unique: true },
  name:      { type: String, required: true },
  type:      { type: String, enum: ['L300', 'Truck', 'Expander'], required: true },
  plate:     { type: String, required: true, unique: true },
  capacity:  { type: String, required: true },
  status:    { type: String, enum: ['Available', 'In Use', 'Maintenance'], default: 'Available' },
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
