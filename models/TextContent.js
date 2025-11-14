// models/TextContent.js (Your existing file - NO CHANGES NEEDED)
import mongoose from 'mongoose';

// Schema for repeatable features (like "Why Choose Us" items)
const FeatureSchema = new mongoose.Schema({
    // Adding _id for list tracking in React frontend
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    title: { type: String, required: true }, // Feature Title
    body: { type: String, required: true },  // Feature Body/Description
    icon: { type: String, default: 'faQuestionCircle' } // Default icon for new features
});

const HomeSchema = new mongoose.Schema({
    slogan: { type: String, default: "Default Slogan" },
    description: { type: String, default: "Default Description for the hero section." },
    // **CRITICAL FIX**: Must be explicitly named to match React component access (home.whyChooseUs)
    whyChooseUs: [FeatureSchema] 
});

const AboutSchema = new mongoose.Schema({
    heroTitle: { type: String, default: "Default About Title" },
    heroDescription: { type: String, default: "Brief description of the About page." },
    mission: { type: String, default: "Our mission is to empower teams with cutting-edge technology." },
    vision: { type: String, default: "Our vision is to become the industry's most reliable partner." },
    journey: { type: String, default: "We started in 2020 with a single project and have grown exponentially." }
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
    about: AboutSchema
});

// Use a consistent model name for easier debugging
export default mongoose.model('TextContent', TextContentSchema);