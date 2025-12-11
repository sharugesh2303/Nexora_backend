import express from 'express';
import { check, validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import auth from '../middleware/auth.js';
import Message from '../models/Message.js';

const router = express.Router();

// ==========================================
// 1. CONFIGURATION & HELPERS
// ==========================================

// Initialize Twilio
// ⚠️ Ensure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are in your .env file
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Helper: Format number for Twilio (E.164 format)
const formatPhoneNumber = (number) => {
    if (!number) return '';
    const cleaned = number.replace(/\D/g, ''); // Remove non-digits
    
    // If 10 digits (India standard), add +91
    if (cleaned.length === 10) return `+91${cleaned}`;
    // If 12 digits starting with 91, add +
    if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
    
    // Fallback: Add + to whatever exists
    return `+${cleaned}`;
};

// ==========================================
// 2. POST ROUTE (Public Contact Form)
// ==========================================
router.post(
    '/',
    [
        check('name', 'Name is required').notEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('mobile', 'Mobile number is required').notEmpty(),
        check('message', 'Message body is required').notEmpty(),
    ],
    async (req, res) => {
        // Validation Check
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, mobile, message } = req.body;

        try {
            // ----------------------------------------------------
            // STEP 1: SAVE TO DATABASE (Admin Panel)
            // ----------------------------------------------------
            const newMessage = new Message({ name, email, mobile, message });
            const savedMessage = await newMessage.save();
            console.log(`✅ [DB] Message Saved: ${savedMessage._id}`);

            // ----------------------------------------------------
            // STEP 2: SEND EMAIL (Nodemailer)
            // ----------------------------------------------------
            try {
                // Check if credentials exist
                if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
                    throw new Error("Missing GMAIL_USER or GMAIL_PASS in .env");
                }

                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.GMAIL_USER,
                        pass: process.env.GMAIL_PASS // Use "App Password", not login password
                    }
                });

                const mailOptions = {
                    from: `"Nexoracrew Form" <${process.env.GMAIL_USER}>`,
                    to: process.env.GMAIL_USER, // Send to yourself
                    subject: "📬 New Contact Inquiry - Nexoracrew",
                    html: `
                        <h3>New Contact Message</h3>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Mobile:</strong> ${mobile}</p>
                        <p><strong>Message:</strong> ${message}</p>
                        <hr/>
                        <small>ID: ${savedMessage._id}</small>
                    `,
                };

                await transporter.sendMail(mailOptions);
                console.log(`✅ [Email] Sent successfully to ${process.env.GMAIL_USER}`);

            } catch (emailErr) {
                console.error(`❌ [Email Failed] Reason: ${emailErr.message}`);
                // We do NOT stop the request here, so DB save is still preserved
            }

            // ----------------------------------------------------
            // STEP 3: SEND WHATSAPP (Twilio)
            // ----------------------------------------------------
            try {
                // Check if credentials exist
                if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
                    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in .env");
                }

                const adminPhone = process.env.ADMIN_PHONE_NUMBER; 
                const formattedAdminPhone = formatPhoneNumber(adminPhone);

                console.log(`🚀 [Twilio] Attempting to send to: ${formattedAdminPhone}`);
                
                const whatsappResponse = await client.messages.create({
                    from: 'whatsapp:+14155238886', // Standard Twilio Sandbox Number
                    to: `whatsapp:${formattedAdminPhone}`,
                    body: `🔔 *New Nexoracrew Inquiry*\n\n👤 *Name:* ${name}\n📱 *Contact:* ${mobile}\n💬 *Msg:* ${message}`
                });

                console.log(`✅ [Twilio] WhatsApp Sent! SID: ${whatsappResponse.sid}`);

            } catch (twilioError) {
                console.error(`❌ [Twilio Failed] Reason: ${twilioError.message}`);
                
                if (twilioError.code === 63015) {
                    console.error("⚠️ CRITICAL: You have not joined the sandbox yet.");
                    console.error("👉 ACTION: Send 'join <keyword>' to +14155238886 on WhatsApp.");
                } else if (twilioError.code === 20003) {
                    console.error("⚠️ CRITICAL: Authentication Error. Check SID/Token in .env");
                }
            }

            // ----------------------------------------------------
            // STEP 4: SEND SUCCESS RESPONSE
            // ----------------------------------------------------
            res.status(201).json({
                message: "Message processed successfully",
                data: savedMessage,
            });

        } catch (err) {
            console.error("❌ [Server Error]", err.message);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
);

// ==========================================
// 3. ADMIN ROUTES (Get/Delete Messages)
// ==========================================

// GET all messages (Protected)
router.get('/', auth, async (req, res) => {
    try {
        const messages = await Message.find().sort({ date: -1 });
        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Toggle Read Status (Protected)
router.put('/:id', auth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ msg: 'Message not found' });

        message.read = !message.read;
        await message.save();
        res.json(message);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Delete Message (Protected)
router.delete('/:id', auth, async (req, res) => {
    try {
        const message = await Message.findByIdAndDelete(req.params.id);
        if (!message) return res.status(404).json({ msg: 'Message not found' });
        res.json({ msg: 'Message deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;