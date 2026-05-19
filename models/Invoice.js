const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true },
  partner:   { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  shipment:  { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
  amount:    { type: Number, required: true },
  dueDate:   { type: Date, required: true },
  status:    { type: String, enum: ['Draft', 'Pending', 'Paid', 'Overdue'], default: 'Pending' },
  ediSent:   { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
