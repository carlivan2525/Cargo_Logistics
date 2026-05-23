const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true },
  partner:   { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  shipment:  { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
  amount:    { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  dueDate:   { type: Date, required: true },
  status:    { type: String, enum: ['Draft', 'Pending', 'Paid', 'Overdue'], default: 'Pending' },
  ediSent:    { type: Boolean, default: false },
  edi997Sent: { type: Boolean, default: false },
  pdfToken:   { type: String, default: null }, // public access token for PDF link
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
