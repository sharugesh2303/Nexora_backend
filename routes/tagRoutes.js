// backend/routes/tagRoutes.js
import express from "express";
import Tag from "../models/Tag.js";
import auth from "../middleware/auth.js";
import slugify from "slugify";

const router = express.Router();

// Validate input
function cleanTagName(name) {
  if (!name) return null;
  return String(name).trim();
}

// Generate slug from name
function makeSlug(name) {
  return slugify(name, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!?:@]/g
  });
}

// GET tags
router.get("/", async (req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });
    res.json(tags);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE tag
router.post("/", auth, async (req, res) => {
  try {
    const name = cleanTagName(req.body.name);

    if (!name) return res.status(400).json({ message: "Tag name required" });

    const slug = makeSlug(name);

    const exists = await Tag.findOne({ slug });
    if (exists) return res.status(400).json({ message: "Tag already exists" });

    const tag = new Tag({ name, slug });
    await tag.save();

    res.status(201).json(tag);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE tag
router.put("/:id", auth, async (req, res) => {
  try {
    const name = cleanTagName(req.body.name);
    if (!name) return res.status(400).json({ message: "Tag name required" });

    const slug = makeSlug(name);

    const updated = await Tag.findByIdAndUpdate(
      req.params.id,
      { name, slug },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Tag not found" });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE tag
router.delete("/:id", auth, async (req, res) => {
  try {
    await Tag.findByIdAndDelete(req.params.id);
    res.json({ message: "Tag deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
