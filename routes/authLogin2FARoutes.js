import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { check, validationResult } from 'express-validator';
import User from '../models/User.js'; // Assuming your Mongoose User model location
import dotenv from 'dotenv'; 

dotenv.config();
const router = express.Router();

// --- Configuration ---
const OTP_EXPIRY_MINUTES = 5;

// --- Nodemailer Transporter Setup (Reads credentials from .env) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        // Reads from environment variables
        user: process.env.GMAIL_USER, 
        pass: process.env.GMAIL_PASS
    }
});

// --- Helper: Generate OTP ---
const generateOtp = () => {
    // Generates a 6-digit number between 100000 and 999999
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// ===================================================
// 🔐 STEP 1: POST /api/auth/login (Authenticates & Sends OTP)
// ===================================================
router.post(
    '/login',
    [
        check('username', 'Please include a valid email').isEmail(),
        check('password', 'Password is required').exists()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        try {
            const user = await User.findOne({ username });
            if (!user) {
                return res.status(400).json({ message: 'Invalid Credentials.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid Credentials.' });
            }

            // --- 1. Generate and Save OTP ---
            const otpCode = generateOtp();
            const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

            // Requires otpCode and otpExpiresAt fields in User model
            await User.updateOne({ _id: user._id }, { otpCode, otpExpiresAt });

            // --- 2. Send OTP via Gmail (Nodemailer) ---
            const mailOptions = {
                from: process.env.GMAIL_USER, 
                to: username,
                subject: 'NEXORACREW Admin Login Verification Code',
                html: `<p>Your One-Time Password (OTP) for NEXORA Admin Login is: <strong>${otpCode}</strong>.
                       <br/>It is valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.</p>`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Nodemailer Error:", error);
                }
                console.log('OTP Email sent to: %s', username);
            });

            // --- 3. Respond to Frontend to switch to OTP form ---
            res.json({ 
                message: 'OTP sent successfully. Please check your email.',
                sessionData: { username: user.username } 
            });

        } catch (err) {
            console.error('Login/OTP Generation Error:', err.message);
            res.status(500).send('Server error during login process.');
        }
    }
);

// ===================================================
// 🔒 STEP 2: POST /api/auth/verify-otp (Verifies OTP & Grants Access)
// ===================================================
router.post(
    '/verify-otp',
    [
        check('username', 'Username (Email) is required').isEmail(),
        check('otp_code', 'OTP Code is required').isLength({ min: 6, max: 6 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, otp_code } = req.body;

        try {
            const user = await User.findOne({ username });
            
            if (!user) {
                return res.status(400).json({ message: 'User not found.' });
            }
            
            // 1. Check if OTP matches
            if (user.otpCode !== otp_code) {
                return res.status(401).json({ message: 'Invalid or incorrect OTP code.' });
            }

            // 2. Check if OTP is expired
            if (user.otpExpiresAt < new Date()) {
                await User.updateOne({ _id: user._id }, { otpCode: null, otpExpiresAt: null });
                return res.status(401).json({ message: 'OTP expired. Please log in again.' });
            }

            // 3. Success: Clear OTP fields and generate final JWT
            await User.updateOne({ _id: user._id }, { otpCode: null, otpExpiresAt: null });

            const payload = {
                user: { id: user.id, username: user.username, role: user.role }
            };

            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '5h' },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token, message: 'Login successful!' }); 
                }
            );

        } catch (err) {
            console.error('OTP Verification Error:', err.message);
            res.status(500).send('Server error during verification.');
        }
    }
);

export default router;