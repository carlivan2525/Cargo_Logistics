const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
  partnerId:  { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  type:       { type: String, enum: ['Retailer', 'Manufacturer', 'Supplier'], required: true },
  isaId:      { type: String, required: true },
  protocol:   { type: String, enum: ['AS2', 'SFTP', 'VAN', 'FTP'], default: 'AS2' },
  status:     { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  ediDocs:    { type: [String], default: ['204', '990', '214', '210'] },
}, { timestamps: true });

module.exports = mongoose.model('Partner', partnerSchema);
