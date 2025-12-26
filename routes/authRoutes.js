import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { check, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

/* ================= CONFIG ================= */
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

/* ================= EMAIL ================= */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

transporter.verify((err) => {
  if (err) {
    console.error('❌ Email transporter error:', err.message);
  } else {
    console.log('✅ Email transporter ready');
  }
});

/* ================= HELPERS ================= */
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* =========================================================
   ADMIN REGISTER (ONE TIME)
   POST /api/auth/register
========================================================= */
router.post(
  '/register',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;

      const existing = await User.findOne({ email });
      if (existing)
        return res.status(400).json({ message: 'User already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);

      await User.create({
        email,
        password: hashedPassword,
        role: 'admin',
      });

      res.status(201).json({
        message: 'Admin created successfully. You can now log in.',
      });
    } catch (err) {
      console.error('REGISTER ERROR:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/* =========================================================
   LOGIN STEP 1 → PASSWORD CHECK + SEND OTP
   POST /api/auth/login
========================================================= */
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user)
        return res.status(400).json({ message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ message: 'Invalid credentials' });

      const otpCode = generateOtp();
      const otpExpiresAt = new Date(
        Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
      );

      user.otpCode = otpCode;
      user.otpExpiresAt = otpExpiresAt;
      user.otpAttempts = 0;
      await user.save();

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'NEXORA Admin Login OTP',
        html: `
          <p>Your OTP is:</p>
          <h2>${otpCode}</h2>
          <p>Valid for ${OTP_EXPIRY_MINUTES} minutes.</p>
        `,
      });

      res.json({
        message: 'OTP sent to your email',
        otpSent: true,
        sessionData: { email },
      });
    } catch (err) {
      console.error('LOGIN ERROR:', err);
      res.status(500).json({ message: 'Server error during login' });
    }
  }
);

/* =========================================================
   LOGIN STEP 2 → VERIFY OTP + JWT
   POST /api/auth/verify-otp
========================================================= */
router.post(
  '/verify-otp',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('otp_code', 'OTP must be 6 digits').isLength({ min: 6, max: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { email, otp_code } = req.body;

      const user = await User.findOne({ email });
      if (!user)
        return res.status(400).json({ message: 'User not found' });

      if (user.otpAttempts >= MAX_OTP_ATTEMPTS)
        return res.status(429).json({ message: 'Too many attempts' });

      if (!user.otpCode || user.otpExpiresAt < new Date())
        return res.status(401).json({ message: 'OTP expired' });

      if (user.otpCode !== otp_code) {
        user.otpAttempts += 1;
        await user.save();
        return res.status(401).json({ message: 'Invalid OTP' });
      }

      user.otpCode = null;
      user.otpExpiresAt = null;
      user.otpAttempts = 0;
      await user.save();

      const token = jwt.sign(
        { user: { id: user.id, email: user.email, role: user.role } },
        process.env.JWT_SECRET,
        { expiresIn: '5h' }
      );

      res.json({ token, message: 'Login successful' });
    } catch (err) {
      console.error('VERIFY OTP ERROR:', err);
      res.status(500).json({ message: 'Server error during verification' });
    }
  }
);

/* =========================================================
   RESEND OTP
   POST /api/auth/resend-otp
========================================================= */
router.post(
  '/resend-otp',
  [check('email', 'Please include a valid email').isEmail()],
  async (req, res) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user)
        return res.status(400).json({ message: 'User not found' });

      const otpCode = generateOtp();
      user.otpCode = otpCode;
      user.otpExpiresAt = new Date(
        Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
      );
      user.otpAttempts = 0;
      await user.save();

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'New NEXORA OTP',
        html: `<h2>${otpCode}</h2>`,
      });

      res.json({ message: 'New OTP sent' });
    } catch (err) {
      console.error('RESEND OTP ERROR:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router;
