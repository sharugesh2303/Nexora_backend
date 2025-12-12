import express from 'express';
import { check, validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import auth from '../middleware/auth.js';
import Message from '../models/Message.js';

const router = express.Router();

// ==========================================
// 1. CONFIGURATION
// ==========================================

// Initialize Twilio
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Helper: Format phone number for Twilio (E.164 format)
const formatPhoneNumber = (number) => {
    if (!number) return '';
    const cleaned = number.replace(/\D/g, ''); 
    if (cleaned.length === 10) return `+91${cleaned}`;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
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
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, mobile, message } = req.body;

        try {
            // ----------------------------------------------------
            // STEP 1: SAVE TO DATABASE
            // ----------------------------------------------------
            const newMessage = new Message({ name, email, mobile, message });
            const savedMessage = await newMessage.save();
            console.log(`✅ [DB] Message Saved: ${savedMessage._id}`);

            // ----------------------------------------------------
            // STEP 2: SEND EMAIL (Updated Template)
            // ----------------------------------------------------
            try {
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.GMAIL_USER,
                        pass: process.env.GMAIL_PASS
                    }
                });

                const mailOptions = {
                    from: `"Nexoracrew Form" <${process.env.GMAIL_USER}>`,
                    to: process.env.GMAIL_USER, 
                    replyTo: email, // 👈 ALLOWS YOU TO CLICK 'REPLY' TO ANSWER THE USER
                    subject: `📬 New Inquiry from ${name}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;">
                            <h2 style="color: #123165; border-bottom: 2px solid #D4A937; padding-bottom: 10px;">New Contact Message</h2>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; width: 80px;">👤 Name:</td>
                                    <td>${name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">📧 Email:</td>
                                    <td style="color: #1a73e8; font-weight: bold;">${email}</td> </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">📱 Mobile:</td>
                                    <td>${mobile}</td>
                                </tr>
                            </table>

                            <div style="margin-top: 20px;">
                                <p style="font-weight: bold; margin-bottom: 5px;">💬 Message:</p>
                                <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #D4A937; border-radius: 4px; font-style: italic;">
                                    "${message}"
                                </div>
                            </div>

                            <br/>
                            <hr style="border: 0; border-top: 1px solid #eee;" />
                            <small style="color: #888;">Message ID: ${savedMessage._id}</small>
                        </div>
                    `,
                };

                await transporter.sendMail(mailOptions);
                console.log(`✅ [Email] Sent successfully to ${process.env.GMAIL_USER}`);

            } catch (emailErr) {
                console.error(`❌ [Email Failed] Reason: ${emailErr.message}`);
            }

            // ----------------------------------------------------
            // STEP 3: SEND WHATSAPP
            // ----------------------------------------------------
            try {
                const adminPhone = process.env.ADMIN_PHONE_NUMBER; 
                const formattedAdminPhone = formatPhoneNumber(adminPhone);

                console.log(`🚀 [Twilio] Sending to: ${formattedAdminPhone}`);
                
                const whatsappResponse = await client.messages.create({
                    from: 'whatsapp:+14155238886', 
                    to: `whatsapp:${formattedAdminPhone}`,
                    body: `🔔 *New Inquiry*\n\n👤 *Name:* ${name}\n📧 *Email:* ${email}\n📱 *Mobile:* ${mobile}\n💬 *Msg:* ${message}`
                });

                console.log(`✅ [Twilio] WhatsApp Sent! SID: ${whatsappResponse.sid}`);

            } catch (twilioError) {
                console.error(`❌ [Twilio Failed] ${twilioError.message}`);
            }

            // ----------------------------------------------------
            // STEP 4: RESPONSE
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
// 3. ADMIN ROUTES (Get/Delete)
// ==========================================

router.get('/', auth, async (req, res) => {
    try {
        const messages = await Message.find().sort({ date: -1 });
        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

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