const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  securityCode: { type: String, required: true },
  dayNum: { type: Number, required: true },
  price: { type: Number },
  used: { type: Boolean, default: false },
  expires: { type: Date, required: true },
  customerName: { type: String },
  description: { type: String },
  // New fields for location (latitude and longitude)
  latitude: { type: Number },
  longitude: { type: Number },
  // New fields for payment type and referral information
  paymentType: { type: String },
  referral: { type: String },
  state: { type: String, enum: ['active', 'used', 'expired'], default: 'active' },
  createdBy: { type: String, required: true }
});

module.exports = mongoose.model('Token', tokenSchema);
