import express from 'express';
import Partner from '../models/Partner.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/partners
// @desc    Get all partners
// @access  Public
router.get('/', async (req, res) => {
  try {
    const partners = await Partner.find().sort({ createdAt: -1 });
    res.json(partners);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/partners
// @desc    Add a new partner
// @access  Private (Admin)
router.post('/', auth, async (req, res) => {
  const { name, logoUrl } = req.body;

  // Basic validation
  if (!name || !logoUrl) {
    return res.status(400).json({ msg: 'Name and Logo URL are required' });
  }

  try {
    const newPartner = new Partner({
      name,
      logoUrl
    });

    const partner = await newPartner.save();
    res.json(partner);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/partners/:id
// @desc    Update a partner
// @access  Private (Admin)
router.put('/:id', auth, async (req, res) => {
  const { name, logoUrl } = req.body;

  try {
    let partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ msg: 'Partner not found' });

    partner.name = name || partner.name;
    partner.logoUrl = logoUrl || partner.logoUrl;

    await partner.save();
    res.json(partner);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/partners/:id
// @desc    Delete a partner
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ msg: 'Partner notfound' });

    await partner.deleteOne();
    res.json({ msg: 'Partner removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

export default router;