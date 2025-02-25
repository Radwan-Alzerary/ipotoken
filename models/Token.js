const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  securityCode: { type: String, required: true, trim: true },
  dayNum: { type: Number, required: true },
  price: { type: Number },
  used: { type: Boolean, default: false },
  expires: { type: Date, required: true },
  customerName: { type: String, trim: true },
  description: { type: String, trim: true },
  // New fields for location (latitude and longitude)
  latitude: { type: Number },
  longitude: { type: Number },
  // New fields for payment type and referral information
  paymentType: { type: String, trim: true },
  referral: { type: String, trim: true },
  state: { type: String, enum: ['active', 'used', 'expired'], default: 'active' },
  createdBy: { type: String, required: true, trim: true },
  // New field: type of system (three options)
  systemType: { 
    type: String, 
    enum: ['راجيتة', 'برنامج مطاعم', 'برنامج ماركتات'], 
    required: true, 
    trim: true 
  },
  // New field: type of buy (three options)
  buyType: { 
    type: String, 
    enum: ['نظام كامل', 'نظام مبيعات', 'نظام مشتريات'], 
    required: true, 
    trim: true 
  }
});

module.exports = mongoose.model('Token', tokenSchema);
