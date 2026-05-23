const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  type:          { type: String, enum: ['credit', 'withdrawal'], required: true },
  amount:        { type: Number, required: true },
  description:   { type: String, default: '' },
  invoice:       { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  partner:       { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
  balance:       { type: Number, required: true },
  paymentMethod: { type: String, default: null }, // 'GCash' | 'Credit Card'
}, { timestamps: true });

module.exports = mongoose.model('Ledger', ledgerSchema);
