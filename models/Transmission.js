const mongoose = require('mongoose');

const transmissionSchema = new mongoose.Schema({
  transmissionId: { type: String, required: true, unique: true },
  ediCode:        { type: String, required: true },   // 204, 990, 214, 210
  label:          { type: String },
  direction:      { type: String, enum: ['IN', 'OUT'], required: true },
  partner:        { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  shipment:       { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', default: null },
  status:         { type: String, enum: ['Sent', 'Received', 'Failed', 'Pending'], required: true },
  isaSegment:     { type: String },
  payload:        { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Transmission', transmissionSchema);
