// routes/storyRoutes.js
import express from "express";
import Story from "../models/Story.js";
import auth from "../middleware/auth.js"; // Admin token middleware

const router = express.Router();

// @route   GET /api/stories
// @desc    Get all stories (Public)
router.get("/", async (_req, res) => {
  try {
    const stories = await Story.find().sort({ date: -1 });
    return res.json(stories);
  } catch (err) {
    console.error("GET /api/stories error:", err.message || err);
    return res.status(500).send("Server Error");
  }
});

// @route   POST /api/stories
// @desc    Add a new story (Admin)
router.post("/", auth, async (req, res) => {
  const { quote, author, role } = req.body;

  try {
    const newStory = new Story({ quote, author, role });
    const story = await newStory.save();
    return res.json(story);
  } catch (err) {
    console.error("POST /api/stories error:", err.message || err);
    return res.status(500).send("Server Error");
  }
});

// @route   PUT /api/stories/:id
// @desc    Update a story (Admin)
router.put("/:id", auth, async (req, res) => {
  const { quote, author, role } = req.body;
  const storyFields = {};
  if (quote !== undefined) storyFields.quote = quote;
  if (author !== undefined) storyFields.author = author;
  if (role !== undefined) storyFields.role = role;

  try {
    let story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ msg: "Story not found" });
    }

    story = await Story.findByIdAndUpdate(
      req.params.id,
      { $set: storyFields },
      { new: true }
    );

    return res.json(story);
  } catch (err) {
    console.error("PUT /api/stories/:id error:", err.message || err);
    return res.status(500).send("Server Error");
  }
});

// @route   DELETE /api/stories/:id
// @desc    Delete a story (Admin)
router.delete("/:id", auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ msg: "Story not found" });
    }

    await Story.findByIdAndDelete(req.params.id);
    return res.json({ msg: "Story removed" });
  } catch (err) {
    console.error("DELETE /api/stories/:id error:", err.message || err);
    return res.status(500).send("Server Error");
  }
});

export default router;
