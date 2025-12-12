// routes/contentRoutes.js
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
        content = new TextContent({
            singletonKey: "site_content",
            general: { email: "default@email.com", phone: "123-456-7890", location: "Default Location" },
            home: { 
                slogan: "Innovation Meets Execution", 
                description: "We deliver digital solutions.", 
                whyChooseUs: [] 
            },
            about: { heroTitle: "Our Story", heroDescription: "...", mission: "...", vision: "...", journey: "..." },
            fixedRoles: [] 
        });
        await content.save();
    }
    return content;
};

// --- PUBLIC ROUTE ---
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
            fixedRoles: text.fixedRoles || [],
            services,
            team,
            posts,
            projects
        });
    } catch (err) {
        console.error("Public Content Route Failed:", err.message);
        res.status(500).send('Server Error');
    }
});

// --- ADMIN ROUTE ---
router.get('/all-editable', auth, async (req, res) => {
    try {
        const text = await getSingletonContent();
        const services = await Service.find();
        const team = await TeamMember.find();

        res.json({
            general: text.general,
            home: text.home,
            about: text.about,
            fixedRoles: text.fixedRoles || [],
            services,
            team
        });
    } catch (err) {
        console.error("Admin Content Route Failed:", err.message);
        res.status(500).send('Server Error');
    }
});

// --- FIXED ROLES ROUTE ---
router.put('/fixed-roles', auth, async (req, res) => {
    try {
        const { fixedRoles } = req.body;

        const updated = await TextContent.findOneAndUpdate(
            { singletonKey: "site_content" },
            { $set: { fixedRoles: fixedRoles } }, 
            { new: true, upsert: true }
        );

        res.json({ fixedRoles: updated.fixedRoles });
    } catch (err) {
        console.error("Failed to save fixed roles:", err.message);
        res.status(500).send('Server Error saving roles');
    }
});

// POST api/content/all-editable (General Text Save)
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
        // Since we updated the Schema, passing req.body directly will now include subgroupLabel
        const newMember = new TeamMember(req.body);
        await newMember.save();
        res.json(newMember);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

router.put('/team/:id', auth, async (req, res) => {
    // ✅ ADDED subgroupLabel to extraction
    const { name, role, bio, img, social, imgScale, imgOffsetX, imgOffsetY, group, subgroup, subgroupLabel } = req.body;

    const memberFields = {
        name, role, bio, img, social,
        imgScale: parseFloat(imgScale) || 1.0, 
        imgOffsetX: parseInt(imgOffsetX, 10) || 0,
        imgOffsetY: parseInt(imgOffsetY, 10) || 0,
        group: parseInt(group) || 999,
        subgroup: parseInt(subgroup) || 0,
        // ✅ ADDED: Pass this to the update
        subgroupLabel: subgroupLabel || "" 
    };
    
    // Clean undefined fields
    Object.keys(memberFields).forEach(key => memberFields[key] === undefined && delete memberFields[key]);

    try {
        const member = await TeamMember.findByIdAndUpdate(
            req.params.id, 
            { $set: memberFields }, 
            { new: true, runValidators: true } 
        );
        if (!member) return res.status(404).json({ msg: 'Team member not found' });
        res.status(200).json(member); 
    } catch (err) { 
        console.error("Team Member PUT Error:", err.message); 
        res.status(500).json({ msg: `Server Error: ${err.message}` }); 
    }
});

router.delete('/team/:id', auth, async (req, res) => {
    try {
        await TeamMember.findByIdAndDelete(req.params.id);
        res.json({ message: 'Team member deleted' });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

export default router;