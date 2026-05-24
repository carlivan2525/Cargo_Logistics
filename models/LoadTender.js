const mongoose = require('mongoose');

const originAddressSchema = new mongoose.Schema({
  locationName:   { type: String, default: '' },
  region:         { type: String, default: '' },
  city:           { type: String, default: '' },
  zipCode:        { type: String, default: '' },
  contactPerson:  { type: String, default: '' },
  contactPhone:   { type: String, default: '' },
}, { _id: false });

const loadTenderSchema = new mongoose.Schema({
  tenderId:        { type: String, required: true, unique: true },
  ediRef:          { type: String },
  partner:         { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  orderId:         { type: String },
  shipmentId:      { type: String, required: true },
  route:           { type: String, required: true },
  carrierId:       { type: String, default: '' },
  carrierName:     { type: String, default: '' },
  carrierScac:     { type: String, default: '' },
  pickupDate:      { type: Date, default: null },
  deliveryDate:    { type: Date, default: null },
  originAddress:   { type: originAddressSchema, default: () => ({}) },
  weight:          { type: String, default: '' },
  commodity:       { type: String, default: '' },
  freightRate:     { type: Number, default: 0 },
  status:          { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
  assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  rejectNotes:     { type: String, default: '' },
  rawEdi:          { type: String },
  rawJson:         { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('LoadTender', loadTenderSchema);
