// models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: 'user' }, // set to 'admin' for your admin account
  date: { type: Date, default: Date.now },

  // --- OTP fields ---
  otpCode: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
});

export default mongoose.model('User', UserSchema);
