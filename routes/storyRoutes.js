// routes/storyRoutes.js
import express from "express";
import Story from "../models/Story.js";
import auth from "../middleware/auth.js"; // middleware can stay CommonJS, ES import will still work

const router = express.Router();

/**
 * @route   GET /api/stories
 * @desc    Get all stories (public - used by HomePage / clients)
 */
router.get("/", async (_req, res) => {
  try {
    const stories = await Story.find().sort({ date: -1 });
    res.json(stories);
  } catch (err) {
    console.error("GET /api/stories error:", err.message || err);
    res.status(500).send("Server Error");
  }
});

/**
 * @route   POST /api/stories
 * @desc    Add a new story (private - admin only)
 */
router.post("/", auth, async (req, res) => {
  const { quote, author, role } = req.body;

  if (!quote || !author || !role) {
    return res.status(400).json({ msg: "quote, author and role are required" });
  }

  try {
    const story = await Story.create({ quote, author, role });
    res.json(story);
  } catch (err) {
    console.error("POST /api/stories error:", err.message || err);
    res.status(500).send("Server Error");
  }
});

/**
 * @route   PUT /api/stories/:id
 * @desc    Update a story (private - admin only)
 */
router.put("/:id", auth, async (req, res) => {
  const { quote, author, role } = req.body;

  const storyFields = {};
  if (quote !== undefined) storyFields.quote = quote;
  if (author !== undefined) storyFields.author = author;
  if (role !== undefined) storyFields.role = role;

  try {
    let story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ msg: "Story not found" });

    story = await Story.findByIdAndUpdate(
      req.params.id,
      { $set: storyFields },
      { new: true }
    );

    res.json(story);
  } catch (err) {
    console.error("PUT /api/stories/:id error:", err.message || err);
    res.status(500).send("Server Error");
  }
});

/**
 * @route   DELETE /api/stories/:id
 * @desc    Delete a story (private - admin only)
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ msg: "Story not found" });
    }

    await Story.findByIdAndDelete(req.params.id);
    res.json({ msg: "Story removed" });
  } catch (err) {
    console.error("DELETE /api/stories/:id error:", err.message || err);
    res.status(500).send("Server Error");
  }
});

export default router;
