const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true, unique: true },
  name:      { type: String, required: true },
  type:      {
    type: String,
    enum: ['Motorcycle', 'Sedan', 'SUV', 'L300', 'Closed Van', 'Elf Truck', 'Wing Van', '6-Wheeler Truck', '10-Wheeler Truck'],
    required: true,
  },
  plate:     { type: String, required: true, unique: true },
  capacity:  { type: String, required: true },
  status:    { type: String, enum: ['Available', 'In Use', 'Maintenance'], default: 'Available' },
  image:     { type: String, default: null }, // base64 data URL
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
