import mongoose from 'mongoose';

/* ---------- Subdocument: Social link ---------- */
const SocialSchema = new mongoose.Schema(
    {
        platform: {
            type: String,
            required: true,
            trim: true,
        },
        url: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { _id: false } 
);

/* ---------- Main: Team Member ---------- */
const TeamMemberSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
            type: String,
            required: true,
            trim: true,
        },
        bio: {
            type: String,
            default: '',
            trim: true,
        },
        img: {
            type: String,
            default: '',
            trim: true,
        },

        // Image transform controls (persisted from Admin)
        imgScale: {
            type: Number, // CRITICAL: Must be Number type
            default: 1,
            min: 0.5, 
            max: 3.0, 
        },
        imgOffsetX: {
            type: Number, // CRITICAL: Must be Number type
            default: 0,
            min: -200,
            max: 200,
        },
        imgOffsetY: {
            type: Number, // CRITICAL: Must be Number type
            default: 0,
            min: -200,
            max: 200,
        },

        // Social links
        social: {
            type: [SocialSchema],
            default: [],
            validate: {
                validator: (arr) =>
                    Array.isArray(arr) &&
                    arr.every(
                        (s) =>
                            s &&
                            typeof s.platform === 'string' &&
                            s.platform.trim().length > 0 &&
                            typeof s.url === 'string' &&
                            s.url.trim().length > 0
                    ),
                message: 'Each social entry must include a platform and url.',
            },
        },
    },
    {
        timestamps: true, 
    }
);

TeamMemberSchema.pre('save', function (next) {
    if (typeof this.imgScale !== 'number') this.imgScale = 1;
    if (typeof this.imgOffsetX !== 'number') this.imgOffsetX = 0;
    if (typeof this.imgOffsetY !== 'number') this.imgOffsetY = 0;
    next();
});

export default mongoose.model('TeamMember', TeamMemberSchema);