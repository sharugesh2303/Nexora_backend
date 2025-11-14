import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { check, validationResult } from 'express-validator';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();
const router = express.Router();

const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});
transporter.verify().catch(() => {});

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// (optional) one-time admin registration
router.post(
  '/register',
  [
    check('username', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;
    try {
      let user = await User.findOne({ username });
      if (user) return res.status(400).json({ message: 'User already exists' });

      const hashed = await bcrypt.hash(password, 10);
      user = await User.create({ username, password: hashed, role: 'admin' });

      return res.status(201).json({ message: 'Admin user created! You can now log in.' });
    } catch (err) {
      console.error('Register error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// STEP 1: password check -> send OTP
router.post(
  '/login',
  [
    check('username', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;

    try {
      const user = await User.findOne({ username });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      const otpCode = generateOtp();
      const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      user.otpCode = otpCode;
      user.otpExpiresAt = otpExpiresAt;
      user.otpAttempts = 0;
      await user.save();

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: username,
        subject: 'NEXORA Admin Login Verification Code',
        html: `
          <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
            <p>Your One-Time Password (OTP) for <b>NEXORA Admin Login</b> is:</p>
            <p style="font-size:20px;margin:8px 0"><b>${otpCode}</b></p>
            <p>This code is valid for <b>${OTP_EXPIRY_MINUTES} minutes</b>. Do not share this code.</p>
          </div>
        `,
      });

      return res.json({
        message: 'OTP sent to your email.',
        otpSent: true,
        sessionData: { username: user.username },
      });
    } catch (err) {
      console.error('Login/OTP error:', err);
      return res.status(500).json({ message: 'Server error during login process.' });
    }
  }
);

// STEP 2: verify OTP -> issue JWT
router.post(
  '/verify-otp',
  [
    check('username', 'Please include a valid email').isEmail(),
    check('otp_code', 'OTP must be 6 digits').isLength({ min: 6, max: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, otp_code } = req.body;

    try {
      const user = await User.findOne({ username });
      if (!user) return res.status(400).json({ message: 'User not found' });

      if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        user.otpCode = null;
        user.otpExpiresAt = null;
        await user.save();
        return res.status(429).json({ message: 'Too many invalid attempts. Please log in again.' });
      }

      if (!user.otpCode || !user.otpExpiresAt)
        return res.status(401).json({ message: 'No active OTP. Please log in again.' });

      if (user.otpExpiresAt < new Date()) {
        user.otpCode = null;
        user.otpExpiresAt = null;
        await user.save();
        return res.status(401).json({ message: 'OTP expired. Please log in again.' });
      }

      if (user.otpCode !== otp_code) {
        user.otpAttempts += 1;
        await user.save();
        return res.status(401).json({ message: 'Invalid OTP.' });
      }

      user.otpCode = null;
      user.otpExpiresAt = null;
      user.otpAttempts = 0;
      await user.save();

      const payload = { user: { id: user.id, username: user.username, role: user.role } };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });

      return res.json({ token, message: 'Login successful!' });
    } catch (err) {
      console.error('Verify OTP error:', err);
      return res.status(500).json({ message: 'Server error during verification.' });
    }
  }
);

// optional resend
router.post(
  '/resend-otp',
  [check('username', 'Please include a valid email').isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username } = req.body;

    try {
      const user = await User.findOne({ username });
      if (!user) return res.status(400).json({ message: 'User not found' });

      const otpCode = generateOtp();
      const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      user.otpCode = otpCode;
      user.otpExpiresAt = otpExpiresAt;
      user.otpAttempts = 0;
      await user.save();

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: username,
        subject: 'Your new NEXORA Admin OTP',
        html: `<p>Your new OTP is <b>${otpCode}</b> (valid ${OTP_EXPIRY_MINUTES} minutes).</p>`,
      });

      return res.json({ message: 'New OTP sent.' });
    } catch (err) {
      console.error('Resend OTP error:', err);
      return res.status(500).json({ message: 'Server error while resending OTP.' });
    }
  }
);

export default router;
