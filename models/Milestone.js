// models/Milestone.js (ESM - Updated with 'key' field)
import mongoose from 'mongoose';

const MilestoneSchema = new mongoose.Schema({
    // NEW: Key field is required, unique, and indexed for fast lookup
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    count: {
        type: Number,
        required: true,
        default: 0 // Set a default value for safety
    },
    label: {
        type: String,
        required: true
    }
}, { timestamps: true });

const Milestone = mongoose.model('Milestone', MilestoneSchema);
export default Milestone;