import mongoose from 'mongoose';

// Schema for repeatable features (like "Why Choose Us" items)
const FeatureSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    icon: { type: String, default: 'faQuestionCircle' }
});

const HomeSchema = new mongoose.Schema({
    slogan: { type: String, default: "Default Slogan" },
    description: { type: String, default: "Default Description for the hero section." },
    whyChooseUs: [FeatureSchema] 
});

const AboutSchema = new mongoose.Schema({
    heroTitle: { type: String, default: "Default About Title" },
    heroDescription: { type: String, default: "Brief description of the About page." },
    mission: { type: String, default: "Our mission is to empower teams." },
    vision: { type: String, default: "Our vision is to become a reliable partner." },
    journey: { type: String, default: "We started in 2020..." }
});

const GeneralSchema = new mongoose.Schema({
    email: { type: String, default: "contact@nexora.com" },
    phone: { type: String, default: "123-456-7890" },
    location: { type: String, default: "San Francisco, CA" }
});

const TextContentSchema = new mongoose.Schema({
    singletonKey: {
        type: String,
        default: "site_content",
        unique: true
    },
    general: GeneralSchema,
    home: HomeSchema,
    about: AboutSchema,

    // ✅ CRITICAL ADDITION: You must have this to save your Roles!
    fixedRoles: [{
        id: Number,
        name: String,
        group: Number,
        subGroup: Number
    }]
}, { timestamps: true });

// ✅ CRITICAL SAFETY FIX:
// Prevents "OverwriteModelError" if the file is imported multiple times.
export default mongoose.models.TextContent || mongoose.model('TextContent', TextContentSchema);