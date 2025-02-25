const mongoose = require('mongoose');

const commandSchema = new mongoose.Schema({
  command: { type: String, required: true, trim: true },
  createdBy: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'sent', 'executed', 'failed'], default: 'pending' },
});

module.exports = mongoose.model('Command', commandSchema);
