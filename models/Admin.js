const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  // الدور: يمكن أن يكون "superadmin" لسوبر المسؤول، أو "admin" للمسؤول العادي
  role: { type: String, enum: ['superadmin', 'admin'], default: 'admin' }
});

module.exports = mongoose.model('Admin', adminSchema);
