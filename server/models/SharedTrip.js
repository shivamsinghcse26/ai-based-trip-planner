const mongoose = require('mongoose');
const crypto = require('crypto');

const SharedTripSchema = new mongoose.Schema({
  token: { type: String, unique: true, required: true, default: () => crypto.randomBytes(6).toString('hex') },
  savedTripId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavedTrip', required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date } // optional expiration
}, { timestamps: true });

module.exports = mongoose.model('SharedTrip', SharedTripSchema);
