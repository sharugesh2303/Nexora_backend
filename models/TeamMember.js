// models/TeamMember.js
import mongoose from 'mongoose';

/* ---------- Subdocument: Social link ---------- */
const SocialSchema = new mongoose.Schema(
    {
        platform: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
    },
    { _id: false } 
);

/* ---------- Main: Team Member ---------- */
const TeamMemberSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        role: { type: String, required: true, trim: true },
        bio: { type: String, default: '', trim: true },
        img: { type: String, default: '', trim: true },

        // Image transform controls
        imgScale: { type: Number, default: 1, min: 0.5, max: 3.0 },
        imgOffsetX: { type: Number, default: 0, min: -200, max: 200 },
        imgOffsetY: { type: Number, default: 0, min: -200, max: 200 },

        // Hierarchy Sorting
        group: { type: Number, default: 999 },
        subgroup: { type: Number, default: 0 },
        
        // ✅ ADDED: This field allows you to name the subgroup (e.g. "Core Developers")
        subgroupLabel: { type: String, default: '', trim: true },

        social: { type: [SocialSchema], default: [] },
    },
    { timestamps: true }
);

// Check if model exists before compiling to avoid hot-reload errors
export default mongoose.models.TeamMember || mongoose.model('TeamMember', TeamMemberSchema);