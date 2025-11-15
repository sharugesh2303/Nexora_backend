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
            about: { heroTitle: "Our Story", heroDescription: "...", mission: "...", vision: "...", journey: "...", faqs: [] } // Initialize faqs array
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
            projects: projects,
            faqs: text.faqs // Expose FAQs via the public route (for client-side display)
        });
    } catch (err) {
        console.error("Public Content Route Failed:", err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * PUT /api/content
 * CRITICAL: Updates the entire singleton content document.
 * Used by the Admin Panel for generic content updates and FAQ fallback.
 * @access Private (Admin)
 */
router.put('/', auth, async (req, res) => {
    try {
        const payload = req.body;
        
        // Find the main editable document.
        const content = await TextContent.findOne({ singletonKey: "site_content" }); 

        if (!content) {
            return res.status(404).json({ msg: 'Content document not found. Cannot save changes.' });
        }

        // Use Object.assign to merge fields dynamically (including nested objects like faqs, home, etc.)
        Object.assign(content, payload);

        await content.save();
        
        return res.json(content); 
        
    } catch (err) {
        console.error('PUT /api/content failed:', err.message);
        return res.status(500).json({ msg: `Server Error during content document update: ${err.message}` });
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
            team: team,
            // Expose faqs here too for the main admin editor, if necessary
            faqs: text.faqs 
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
router.put('/team/:id', auth, async (req, res) => {
    const { 
        name, role, bio, img, social, 
        imgScale, imgOffsetX, imgOffsetY 
    } = req.body;

    const memberFields = {
        name, role, bio, img, social, 
        imgScale: parseFloat(imgScale) || 1.0, 
        imgOffsetX: parseInt(imgOffsetX, 10) || 0,
        imgOffsetY: parseInt(imgOffsetY, 10) || 0,
    };
    
    Object.keys(memberFields).forEach(key => memberFields[key] === undefined && delete memberFields[key]);

    try {
        const member = await TeamMember.findByIdAndUpdate(
            req.params.id, 
            { $set: memberFields }, 
            { new: true, runValidators: true } 
        );

        if (!member) {
            return res.status(404).json({ msg: 'Team member not found' });
        }
        
        res.status(200).json(member); 
        
    } catch (err) { 
        console.error("Team Member PUT Error:", err.message); 
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