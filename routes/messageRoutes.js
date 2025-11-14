import express from 'express';
import { check, validationResult } from 'express-validator';
import auth from '../middleware/auth.js'; 
import Message from '../models/Message.js'; 

const router = express.Router();

// ----------------------------------------------------------------------
// @route   POST /messages (Public contact form submission)
// @access  Public
// ----------------------------------------------------------------------
router.post(
    '/', 
    [
        // Validation checks using express-validator
        check('name', 'Name is required').notEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('mobile', 'Mobile number is required').notEmpty(), 
        check('message', 'Message body is required').notEmpty()
    ], 
    async (req, res) => {
        const errors = validationResult(req);

        // 1. Check for Validation Errors
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, mobile, message } = req.body; 
        
        try {
            // 2. Create and Save the New Message
            const newMessage = new Message({ name, email, mobile, message }); 
            
            // 🚨 CRITICAL FIX: Ensure the asynchronous save operation is AWAITED
            const savedMessage = await newMessage.save();
            
            console.log(`[Message Sent] ID: ${savedMessage._id} from ${email}`);

            // 3. Send Success Response
            res.status(201).json({ message: "Message sent successfully!", data: savedMessage }); 

        } catch (err) {
            // 4. Handle Database/Server Errors
            console.error('Database Save/Route Error:', err.message);
            res.status(500).send('Server Error: Failed to save message.'); 
        }
    }
);

// ----------------------------------------------------------------------
// Other Admin Routes (GET, PUT, DELETE) - Kept as provided
// ----------------------------------------------------------------------

// @route   GET /messages
// @access  Private 
router.get('/', auth, async (req, res) => {
    try {
        const messages = await Message.find().sort({ date: -1 }); 
        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /messages/:id (Toggle Read)
// @access  Private
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

// @route   DELETE /messages/:id
// @access  Private
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