// routes/milestones.js (ESM - FIXED Import)
import express from 'express';
import Milestone from '../models/Milestone.js';

// FIX: Import the default export 'auth' as 'authMiddleware' or any name
import authMiddleware from '../middleware/auth.js'; 

const router = express.Router();

// Helper function to get Milestone by ID (used internally by PUT/DELETE)
const getMilestone = async (req, res, next) => {
    let milestone;
    try {
        milestone = await Milestone.findById(req.params.id);
        if (milestone == null) {
            return res.status(404).json({ message: 'Milestone not found' });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
    res.milestone = milestone;
    next();
};

// ==========================================================
// --- GET ALL MILESTONES (PUBLIC: Fetch for homepage display) ---
// Route: GET /api/milestones
// ==========================================================
router.get('/', async (req, res) => {
    try {
        const items = await Milestone.find().sort({ createdAt: 1 });
        res.status(200).json(items);
    } catch (err) {
        console.error('Error fetching milestones:', err.message);
        res.status(500).json({ message: 'Failed to retrieve milestones.' });
    }
});


// ==========================================================
// --- CREATE a Milestone (PROTECTED: Used by Admin panel) ---
// Route: POST /api/milestones
// Uses the imported default export: authMiddleware
// ==========================================================
router.post('/', authMiddleware, async (req, res) => {
    const { key, label, count } = req.body;
    
    if (!key || !label) {
        return res.status(400).json({ message: 'Milestone key and label are required.' });
    }

    try {
        const newMilestone = new Milestone({
            key, 
            label,
            count: Number(count) || 0,
        });
        
        const savedMilestone = await newMilestone.save();
        res.status(201).json(savedMilestone);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: `Milestone key '${key}' already exists.` });
        }
        res.status(400).json({ message: err.message });
    }
});


// ==========================================================
// --- UPDATE a Milestone (PROTECTED: Used by Admin panel) ---
// Route: PUT /api/milestones/:id
// Uses the imported default export: authMiddleware
// ==========================================================
router.put('/:id', authMiddleware, getMilestone, async (req, res) => {
    const { label, count } = req.body;
    
    if (req.body.key) {
        return res.status(400).json({ message: 'Milestone key cannot be changed after creation.' });
    }

    if (label != null) res.milestone.label = label;
    if (count != null) res.milestone.count = Number(count);

    try {
        const updatedMilestone = await res.milestone.save();
        res.status(200).json(updatedMilestone);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});


// ==========================================================
// --- DELETE a Milestone (PROTECTED: Used by Admin panel) ---
// Route: DELETE /api/milestones/:id
// Uses the imported default export: authMiddleware
// ==========================================================
router.delete('/:id', authMiddleware, getMilestone, async (req, res) => {
    try {
        await Milestone.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Milestone deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;