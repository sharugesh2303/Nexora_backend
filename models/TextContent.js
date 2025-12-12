// src/models/TextContent.js
import mongoose from 'mongoose';

// Schema for repeatable features
const FeatureSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  icon: { type: String, default: 'faQuestionCircle' }
});

// Home schema
const HomeSchema = new mongoose.Schema({
  slogan: { type: String, default: "Default Slogan" },
  description: { type: String, default: "Default Description for the hero section." },
  whyChooseUs: [FeatureSchema]
});

// About schema
const AboutSchema = new mongoose.Schema({
  heroTitle: { type: String, default: "Default About Title" },
  heroDescription: { type: String, default: "Brief description of the About page." },
  mission: { type: String, default: "Our mission is to empower teams." },
  vision: { type: String, default: "Our vision is to become a reliable partner." },
  journey: { type: String, default: "We started in 2020..." }
});

// General schema
const GeneralSchema = new mongoose.Schema({
  email: { type: String, default: "contact@nexora.com" },
  phone: { type: String, default: "123-456-7890" },
  location: { type: String, default: "San Francisco, CA" }
});

// TextContent singleton
const TextContentSchema = new mongoose.Schema({
  singletonKey: { type: String, default: "site_content", unique: true },
  general: GeneralSchema,
  home: HomeSchema,
  about: AboutSchema,
  // fixedRoles: admin-controlled array used by frontend for group/subgroup labels
  fixedRoles: [{
    id: Number,        // optional id for admin UI
    name: String,      // human label (e.g., "FOUNDER & CEO")
    group: Number,     // numeric group id
    subGroup: Number,  // numeric subgroup id
    // optional: you may also include subgroupLabel/subgroupName fields
    subgroupLabel: String
  }]
}, { timestamps: true });

// Prevent OverwriteModelError in dev/hot-reload
export default mongoose.models.TextContent || mongoose.model('TextContent', TextContentSchema);
