import express from 'express';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import Schedule from '../models/Schedule.js';
import auth from '../middleware/auth.js';

const router = express.Router();
const ALLOWED_STATUSES = ['pending', 'confirmed', 'cancelled'];

// -------------------------------------------------------------
//  POST /api/schedule (Submit Meeting Request)
// -------------------------------------------------------------
router.post('/', async (req, res) => {
    try {
        const { name, companyName, role, mobile, email, message, meetingDate, meetingTime } = req.body;

        // 1️⃣ VALIDATION
        if (!name || !companyName || !email || !meetingDate || !meetingTime) {
            return res.status(400).json({ msg: 'Please include required fields: name, companyName, email, meetingDate, meetingTime.' });
        }

        // 2️⃣ SAVE TO DATABASE
        const newSchedule = new Schedule({
            name,
            companyName,
            role,
            mobile,
            email,
            message,
            meetingDate,
            meetingTime
        });
        const savedSchedule = await newSchedule.save();
        console.log(`📅 Meeting Saved: ${savedSchedule._id}`);

        // Helper: Format Date for readability
        const formattedDate = new Date(meetingDate).toDateString();

        // 3️⃣ SEND EMAIL NOTIFICATION (Nodemailer)
        // Updated to include ALL model data
        try {
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_PASS
                }
            });

            const mailOptions = {
                from: `"Nexoracrew Scheduler" <${process.env.GMAIL_USER}>`,
                to: process.env.GMAIL_USER, // Send to Admin
                subject: "📅 New Meeting Request - Nexoracrew",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">New Meeting Request</h2>
                        <p>A new meeting has been scheduled via the portal.</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                            <tr style="background-color: #f8f9fa;">
                                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Status:</strong></td>
                                <td style="padding: 10px; border: 1px solid #ddd; color: orange;">Pending</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Name:</strong></td>
                                <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
                            </tr>
                            <tr style="background-color: #f8f9fa;">
                                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Company:</strong></td>
                                <td style="padding: 10px; border: 1px solid #ddd;">${companyName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Role:</strong></td>
                                <td style="padding: 10px; border: 1px solid #ddd;">${role || 'N/A'}</td>
                            </tr>
                            <tr style="background-color: #f8f9fa;">
                                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email:</strong></td>
                                <td style="padding: 10px; border: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Mobile:</strong></td>
                                <td style="padding: 10px; border: 1px solid #ddd;">${mobile || 'N/A'}</td>
                            </tr>
                            <tr style="background-color: #f8f9fa;">
                                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td>
                                <td style="padding: 10px; border: 1px solid #ddd;">${formattedDate}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
                                <td style="padding: 10px; border: 1px solid #ddd;">${meetingTime}</td>
                            </tr>
                        </table>

                        <div style="margin-top: 20px; padding: 15px; background-color: #f1f1f1; border-left: 5px solid #007bff;">
                            <strong>📝 Message:</strong><br/>
                            <p style="margin-top: 5px;">${message || 'No additional message provided.'}</p>
                        </div>
                        
                        <p style="font-size: 12px; color: #888; margin-top: 30px;">Request ID: ${savedSchedule._id}</p>
                    </div>
                `,
            };

            await transporter.sendMail(mailOptions);
            console.log(`📨 Schedule Email Sent to Admin`);
        } catch (emailErr) {
            console.error("⚠️ Email Failed:", emailErr.message);
        }

        // 4️⃣ SEND WHATSAPP NOTIFICATION (Twilio)
        // Updated to include ALL model data
        try {
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            
            // Constructing a detailed WhatsApp message
            const whatsappBody = `📅 *New Meeting Request - Nexoracrew*\n\n` +
                `👤 *Name:* ${name}\n` +
                `🏢 *Company:* ${companyName}\n` +
                `💼 *Role:* ${role || 'N/A'}\n` +
                `📧 *Email:* ${email}\n` +
                `📱 *Mobile:* ${mobile || 'N/A'}\n` +
                `------------------\n` +
                `🗓 *Date:* ${formattedDate}\n` +
                `⏰ *Time:* ${meetingTime}\n` +
                `📊 *Status:* Pending\n` +
                `------------------\n` +
                `📝 *Message:* ${message || 'No message'}`;

            await client.messages.create({
                from: 'whatsapp:+14155238886', // Sandbox Number
                to: `whatsapp:${process.env.ADMIN_PHONE_NUMBER}`, // Your Verified Number
                body: whatsappBody
            });
            console.log(`✅ WhatsApp Schedule Notification Sent`);
        } catch (whatsappError) {
            console.error("⚠️ WhatsApp Failed:", whatsappError.message);
        }

        // 5️⃣ RETURN SUCCESS
        return res.status(201).json({ msg: 'Meeting request submitted successfully', schedule: savedSchedule });

    } catch (err) {
        console.error('❌ POST /api/schedule error:', err);
        return res.status(500).send('Server Error');
    }
});

// -------------------------------------------------------------
//  GET /api/schedule (Admin Only)
// -------------------------------------------------------------
router.get('/', auth, async (req, res) => {
    try {
        const schedules = await Schedule.find().sort({ dateSubmitted: -1 });
        return res.json(schedules);
    } catch (err) {
        console.error('GET /api/schedule error:', err);
        return res.status(500).send('Server Error');
    }
});

// -------------------------------------------------------------
//  GET /api/schedule/:id (Admin Only)
// -------------------------------------------------------------
router.get('/:id', auth, async (req, res) => {
    try {
        const sched = await Schedule.findById(req.params.id);
        if (!sched) return res.status(404).json({ msg: 'Schedule not found' });
        return res.json(sched);
    } catch (err) {
        console.error('GET /api/schedule/:id error:', err);
        return res.status(500).send('Server Error');
    }
});

// -------------------------------------------------------------
//  PATCH /api/schedule/:id (Update Status)
// -------------------------------------------------------------
router.patch('/:id', auth, async (req, res) => {
    try {
        const updates = { ...req.body };
        if (updates.status && !ALLOWED_STATUSES.includes(updates.status)) {
            return res.status(400).json({ msg: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
        }
        delete updates._id;

        const updated = await Schedule.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!updated) return res.status(404).json({ msg: 'Schedule not found' });
        return res.json(updated);
    } catch (err) {
        console.error('PATCH /api/schedule/:id error:', err);
        return res.status(500).send('Server Error');
    }
});

// -------------------------------------------------------------
//  DELETE /api/schedule/:id (Delete Request)
// -------------------------------------------------------------
router.delete('/:id', auth, async (req, res) => {
    try {
        const schedule = await Schedule.findByIdAndDelete(req.params.id);
        if (!schedule) return res.status(404).json({ msg: 'Schedule not found' });
        return res.json({ msg: 'Schedule deleted' });
    } catch (err) {
        console.error('DELETE /api/schedule/:id error:', err);
        return res.status(500).send('Server Error');
    }
});

export default router;