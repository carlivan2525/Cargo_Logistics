const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  shipmentId:    { type: String, required: true, unique: true },
  transactionId: { type: String, default: null },
  route:      { type: String, required: true },
  origin:     { type: String },
  partner:    { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  vehicle:    { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  tender:     { type: mongoose.Schema.Types.ObjectId, ref: 'LoadTender', default: null },
  status:     {
    type: String,
    enum: ['Pending', 'Pickup', 'In Transit', 'Delivered', 'Exception'],
    default: 'Pending',
  },
  edi214Sent: { type: Boolean, default: false },
  deliveredAt: { type: Date, default: null },
  estimatedDeliveryDate: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Shipment', shipmentSchema);
