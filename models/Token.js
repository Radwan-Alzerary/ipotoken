const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const tokenSchema = new mongoose.Schema({
  securityCode: { type: String, required: true, trim: true },
  dayNum: { type: Number, required: true },
  price: { type: Number },
  used: { type: Boolean, default: false },
  expires: { type: Date, required: true },
  customerName: { type: String, trim: true },
  description: { type: String, trim: true },
  latitude: { type: Number },
  longitude: { type: Number },
  paymentType: { type: String, trim: true },
  referral: { type: String, trim: true },
  state: { type: String, enum: ['active', 'used', 'expired'], default: 'active' },
  createdBy: { type: String, required: true, trim: true },
  systemType: { 
    type: String, 
    enum: ['راجيتة', 'برنامج مطاعم', 'برنامج ماركتات'], 
    trim: true 
  },
  buyType: { 
    type: String, 
    enum: ['نظام كامل', 'نظام مبيعات', 'نظام مشتريات'], 
    trim: true 
  },
  // New field to store comments (commands)
  comments: [commentSchema]
});

module.exports = mongoose.model('Token', tokenSchema);
