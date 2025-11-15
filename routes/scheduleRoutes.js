// routes/schedule.js
import express from 'express';
import Schedule from '../models/Schedule.js';
import auth from '../middleware/auth.js'; // keep existing auth middleware

const router = express.Router();

// Helper: allowed status values
const ALLOWED_STATUSES = ['pending', 'confirmed', 'cancelled'];

/**
 * POST /api/schedule
 * Client submits a new meeting request (public)
 */
router.post('/', async (req, res) => {
  try {
    const { name, companyName, role, mobile, email, message, meetingDate, meetingTime } = req.body;

    if (!name || !companyName || !email || !meetingDate || !meetingTime) {
      return res.status(400).json({ msg: 'Please include required fields: name, companyName, email, meetingDate, meetingTime.' });
    }

    const newSchedule = new Schedule({
      name,
      companyName,
      role,
      mobile,
      email,
      message,
      meetingDate,
      meetingTime
    });

    await newSchedule.save();
    return res.status(201).json({ msg: 'Meeting request submitted', schedule: newSchedule });
  } catch (err) {
    console.error('POST /api/schedule error:', err);
    return res.status(500).send('Server Error');
  }
});

/**
 * GET /api/schedule
 * Get all scheduled meeting requests (admin)
 */
router.get('/', auth, async (req, res) => {
  try {
    const schedules = await Schedule.find().sort({ dateSubmitted: -1 });
    return res.json(schedules);
  } catch (err) {
    console.error('GET /api/schedule error:', err);
    return res.status(500).send('Server Error');
  }
});

/**
 * GET /api/schedule/:id
 * Get single schedule (admin)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const sched = await Schedule.findById(req.params.id);
    if (!sched) return res.status(404).json({ msg: 'Schedule not found' });
    return res.json(sched);
  } catch (err) {
    console.error('GET /api/schedule/:id error:', err);
    return res.status(500).send('Server Error');
  }
});

/**
 * PATCH /api/schedule/:id
 * Partial update (admin)
 * Accepts a partial body (e.g. { status: 'confirmed' })
 */
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = { ...req.body };

    // If status provided, validate it
    if (updates.status && !ALLOWED_STATUSES.includes(updates.status)) {
      return res.status(400).json({ msg: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
    }

    // Ensure we don't accidentally let client set _id
    delete updates._id;

    const updated = await Schedule.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ msg: 'Schedule not found' });
    return res.json(updated);
  } catch (err) {
    console.error('PATCH /api/schedule/:id error:', err);
    return res.status(500).send('Server Error');
  }
});

/**
 * PUT /api/schedule/:id
 * Full update (admin)
 * Expects the full schedule payload (but we allow partial as well)
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const payload = { ...req.body };

    if (payload.status && !ALLOWED_STATUSES.includes(payload.status)) {
      return res.status(400).json({ msg: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
    }

    delete payload._id;

    const updated = await Schedule.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ msg: 'Schedule not found' });
    return res.json(updated);
  } catch (err) {
    console.error('PUT /api/schedule/:id error:', err);
    return res.status(500).send('Server Error');
  }
});

/**
 * POST /api/schedule/:id/status
 * Convenience endpoint for status-only updates (admin)
 * Body: { status: 'confirmed' }
 */
router.post('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ msg: `Invalid or missing status. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
    }

    const updated = await Schedule.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ msg: 'Schedule not found' });
    return res.json(updated);
  } catch (err) {
    console.error('POST /api/schedule/:id/status error:', err);
    return res.status(500).send('Server Error');
  }
});

/**
 * DELETE /api/schedule/:id
 * Delete a scheduled meeting (admin)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) return res.status(404).json({ msg: 'Schedule not found' });
    return res.json({ msg: 'Schedule deleted' });
  } catch (err) {
    console.error('DELETE /api/schedule/:id error:', err);
    return res.status(500).send('Server Error');
  }
});

export default router;
