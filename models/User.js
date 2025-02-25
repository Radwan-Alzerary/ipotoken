const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  ip: String,
  token: String,
  deviceKey: String,
  timestamp: { type: Date, default: Date.now },
  pcInfo: String, // معلومات الجهاز (سيتم الحصول عليها من الخادم باستخدام وحدة os)
  osInfo: String  // معلومات نظام التشغيل من رأس User-Agent

});

module.exports = mongoose.model('User', userSchema);
