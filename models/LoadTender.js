const mongoose = require('mongoose');

const loadTenderSchema = new mongoose.Schema({
  tenderId:        { type: String, required: true, unique: true },
  ediRef:          { type: String },
  partner:         { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  shipmentId:      { type: String, required: true },
  route:           { type: String, required: true },
  pickupDate:      { type: Date, required: true },
  deliveryDate:    { type: Date, required: true },
  weight:          { type: String },
  commodity:       { type: String },
  status:          { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
  assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  rawEdi:          { type: String },
}, { timestamps: true });

module.exports = mongoose.model('LoadTender', loadTenderSchema);
