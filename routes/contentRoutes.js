import express from 'express';
import auth from '../middleware/auth.js'; 

import TextContent from '../models/TextContent.js';
import Service from '../models/Service.js';
import TeamMember from '../models/TeamMember.js';
import Post from '../models/Post.js';
import Project from '../models/Project.js'; 

const router = express.Router();

// --- Helper Function ---
const getSingletonContent = async () => {
    let content = await TextContent.findOne({ singletonKey: "site_content" });
    if (!content) {
        // Create initial content if it doesn't exist (ensures initial data structure is valid)
        content = new TextContent({
            general: { email: "default@email.com", phone: "123-456-7890", location: "Default Location" },
            home: { 
                slogan: "Innovation Meets Execution", 
                description: "We deliver digital solutions that redefine industry standards.", 
                whyChooseUs: [
                    { title: "Expert Team", body: "Seasoned professionals in every domain.", icon: "faUsers" },
                    { title: "Custom Solutions", body: "Tailored to your specific business needs.", icon: "faTools" },
                    { title: "24/7 Support", body: "We're always here when you need us.", icon: "faHeadset" },
                ] 
            },
            about: { heroTitle: "Our Story", heroDescription: "...", mission: "...", vision: "...", journey: "..." }
        });
        await content.save();
    }
    return content;
};


// --- PUBLIC ROUTE (for client-app) ---
// GET api/content/all
router.get('/all', async (req, res) => {
    try {
        const text = await getSingletonContent();
        const services = await Service.find();
        const team = await TeamMember.find();
        const posts = await Post.find().sort({ date: -1 });
        const projects = await Project.find().sort({ date: -1 });

        res.json({
            general: text.general,
            home: text.home,
            about: text.about,
            services: services,
            team: team,
            posts: posts,
            projects: projects
        });
    } catch (err) {
        console.error("Public Content Route Failed:", err.message);
        res.status(500).send('Server Error');
    }
});

// --- ADMIN ROUTE ---
// GET api/content/all-editable 
router.get('/all-editable', auth, async (req, res) => {
    try {
        const text = await getSingletonContent();
        const services = await Service.find();
        const team = await TeamMember.find();

        res.json({
            general: text.general,
            home: text.home,
            about: text.about,
            services: services,
            team: team
        });
    } catch (err) {
        console.error("Admin Content Route Failed (Database/Mongoose Error):", err.message);
        res.status(500).send('Server Error: Failed to load editable content.');
    }
});

// POST api/content/all-editable (Text Content Save)
router.post('/all-editable', auth, async (req, res) => {
    const { general, home, about } = req.body; 
    try {
        const updatedContent = await TextContent.findOneAndUpdate(
            { singletonKey: "site_content" },
            { $set: { general, home, about } },
            { new: true, upsert: true }
        );
        res.json(updatedContent);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- CRUD for Services ---
router.post('/services', auth, async (req, res) => {
    try {
        const newService = new Service(req.body);
        await newService.save();
        res.json(newService);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});
router.put('/services/:id', auth, async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(service);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});
router.delete('/services/:id', auth, async (req, res) => {
    try {
        await Service.findByIdAndDelete(req.params.id);
        res.json({ message: 'Service deleted' });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// --- CRUD for Team ---
router.post('/team', auth, async (req, res) => {
    try {
        const newMember = new TeamMember(req.body);
        await newMember.save();
        res.json(newMember);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// ** TEAM MEMBER UPDATE ROUTE - FINAL ROBUST VERSION **
router.put('/team/:id', auth, async (req, res) => {
    const { 
        name, role, bio, img, social, 
        imgScale, imgOffsetX, imgOffsetY 
    } = req.body;

    // Create the update object with explicit type guards and fallbacks.
    // We use the || operator defensively here to ensure Mongoose never sees 
    // an undefined or null value that hasn't been cast.
    const memberFields = {
        name, 
        role, 
        bio, 
        img, 
        social: social, 
        
        // CRITICAL FIX: Ensure these fields are explicitly included and cast as Numbers.
        // If the value is missing in req.body (e.g., undefined), it falls back to 
        // the default and is successfully cast to a Number before the update.
        imgScale: parseFloat(imgScale) || 1.0, 
        imgOffsetX: parseInt(imgOffsetX, 10) || 0,
        imgOffsetY: parseInt(imgOffsetY, 10) || 0,
    };
    
    // Clean up fields that are truly undefined (shouldn't be needed with the above || guards, but safer)
    Object.keys(memberFields).forEach(key => memberFields[key] === undefined && delete memberFields[key]);

    try {
        const member = await TeamMember.findByIdAndUpdate(
            req.params.id, 
            { $set: memberFields }, // Use $set for surgical updates
            { new: true, runValidators: true } // Return the new document and run Mongoose validation
        );

        if (!member) {
            return res.status(404).json({ msg: 'Team member not found' });
        }
        
        // Return 200 OK with the updated document
        res.status(200).json(member); 
        
    } catch (err) { 
        console.error("Team Member PUT Error:", err.message); 
        // Send a detailed error message back to the client
        res.status(500).json({ msg: `Server Error: Failed to update member. ${err.message}` }); 
    }
});

router.delete('/team/:id', auth, async (req, res) => {
    try {
        await TeamMember.findByIdAndDelete(req.params.id);
        res.json({ message: 'Team member deleted' });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

export default router;