// routes/faqs.js
import express from 'express';
import Faq from '../models/Faq.js';
import requireAuth from '../middleware/auth.js';

const router = express.Router();

// GET /api/content/faqs  (public)
router.get('/', async (req, res) => {
  try {
    const faqs = await Faq.find().sort({ order: -1, createdAt: -1 }).lean();
    return res.json(faqs);
  } catch (err) {
    console.error('GET /api/content/faqs error', err);
    return res.status(500).json({ message: 'Failed to load FAQs' });
  }
});

// GET /api/content/faqs/:id
router.get('/:id', async (req, res) => {
  try {
    const faq = await Faq.findById(req.params.id).lean();
    if (!faq) return res.status(404).json({ message: 'FAQ not found' });
    return res.json(faq);
  } catch (err) {
    console.error('GET /api/content/faqs/:id error', err);
    return res.status(500).json({ message: 'Failed to load FAQ' });
  }
});

// POST (protected)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { question, answer, order } = req.body;
    if (!question || !answer) return res.status(400).json({ message: 'Question and answer required' });
    const created = await Faq.create({ question, answer, order: order ?? 0 });
    return res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/content/faqs error', err);
    return res.status(500).json({ message: 'Failed to create FAQ' });
  }
});

// PUT (protected)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { question, answer, order } = req.body;
    const updated = await Faq.findByIdAndUpdate(
      req.params.id,
      { question, answer, ...(order !== undefined ? { order } : {}), updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'FAQ not found' });
    return res.json(updated);
  } catch (err) {
    console.error('PUT /api/content/faqs/:id error', err);
    return res.status(500).json({ message: 'Failed to update FAQ' });
  }
});

// DELETE (protected)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const removed = await Faq.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'FAQ not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /api/content/faqs/:id error', err);
    return res.status(500).json({ message: 'Failed to delete FAQ' });
  }
});

export default router;
