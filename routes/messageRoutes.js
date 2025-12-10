import express from 'express';
import { check, validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import twilio from 'twilio'; // 1. Import Twilio
import auth from '../middleware/auth.js';
import Message from '../models/Message.js';

const router = express.Router();

// Initialize Twilio Client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// -------------------------------------------------------------
//  POST /messages  (Public Contact Form Submission)
// -------------------------------------------------------------
router.post(
    '/',
    [
        check('name', 'Name is required').notEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('mobile', 'Mobile number is required').notEmpty(),
        check('message', 'Message body is required').notEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, mobile, message } = req.body;

        try {
            // 1️⃣ SAVE IN DATABASE
            const newMessage = new Message({ name, email, mobile, message });
            const savedMessage = await newMessage.save();

            console.log(`📩 Message Saved: ${savedMessage._id}`);

            // 2️⃣ SETUP NODEMAILER TRANSPORTER
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_PASS
                }
            });

            // 3️⃣ EMAIL CONTENT
            const mailOptions = {
                from: `"Nexora Contact" <${process.env.GMAIL_USER}>`,
                to: process.env.GMAIL_USER,  // sending to your own mail
                subject: "📬 New Contact Form Message - Nexora",
                html: `
                    <h2>New Contact Message</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Mobile:</strong> ${mobile}</p>
                    <p><strong>Message:</strong></p>
                    <p>${message}</p>
                    <br/>
                    <hr/>
                    <small>Message ID: ${savedMessage._id}</small>
                `,
            };

            // 4️⃣ SEND THE EMAIL
            await transporter.sendMail(mailOptions);
            console.log(`📨 Email Sent To Admin: ${process.env.GMAIL_USER}`);

            // 5️⃣ SEND WHATSAPP NOTIFICATION (NEW)
            try {
                await client.messages.create({
                    from: 'whatsapp:+14155238886', // Twilio Sandbox Number
                    to: `whatsapp:${process.env.ADMIN_PHONE_NUMBER}`, // Your Verified Number
                    body: `🔔 *New Nexora Inquiry*\n\n👤 *Name:* ${name}\n📱 *Mobile:* ${mobile}\n💬 *Msg:* ${message}`
                });
                console.log(`✅ WhatsApp Notification Sent to Admin`);
            } catch (whatsappError) {
                // We log the error but don't stop the response because the message was already saved/emailed
                console.error("⚠️ WhatsApp Failed:", whatsappError.message);
            }

            // 6️⃣ SEND SUCCESS RESPONSE
            res.status(201).json({
                message: "Message saved, emailed & notified successfully!",
                data: savedMessage,
            });

        } catch (err) {
            console.error("❌ Message Route Error:", err.message);
            res.status(500).json({
                message: "Server Error: Failed to send message",
                error: err.message
            });
        }
    }
);

// -------------------------------------------------------------
//  GET /messages (Admin Only)
// -------------------------------------------------------------
router.get('/', auth, async (req, res) => {
    try {
        const messages = await Message.find().sort({ date: -1 });
        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// -------------------------------------------------------------
//  PUT /messages/:id (Toggle Read Status)
// -------------------------------------------------------------
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

// -------------------------------------------------------------
//  DELETE /messages/:id (Admin Delete Message)
// -------------------------------------------------------------
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