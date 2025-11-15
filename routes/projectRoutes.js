// backend/routes/projectRoutes.js
import express from "express";
import mongoose from "mongoose";
import Project from "../models/Project.js";
import Tag from "../models/Tag.js";
import auth from "../middleware/auth.js";

const router = express.Router();

/**
 * normalizeTags(raw)
 * Accepts:
 *  - ["React", "Node"]
 *  - [{ _id: "...", name: "React" }, "JS"]
 *  - ["605c..."] (ObjectId strings referencing Tag docs)
 * Returns: unique array of trimmed tag NAMES
 */
async function normalizeTags(raw = []) {
  if (!Array.isArray(raw)) return [];

  const names = [];
  const tagIds = [];

  for (const t of raw) {
    if (!t) continue;
    if (typeof t === "object" && t !== null) {
      if (t.name) {
        names.push(String(t.name).trim());
      } else if (t._id && mongoose.isValidObjectId(String(t._id))) {
        tagIds.push(String(t._id));
      }
      continue;
    }
    if (typeof t === "string") {
      const s = t.trim();
      if (!s) continue;
      if (mongoose.isValidObjectId(s)) tagIds.push(s);
      else names.push(s);
    }
  }

  if (tagIds.length > 0) {
    try {
      const docs = await Tag.find({ _id: { $in: tagIds } }).lean().exec();
      for (const d of docs) {
        if (d && d.name) names.push(String(d.name).trim());
      }
    } catch (err) {
      // don't fail the whole request if tag lookup fails — log and continue
      console.warn("normalizeTags: failed to lookup tag ids:", err && err.message ? err.message : err);
    }
  }

  // dedupe & remove falsy values
  return Array.from(new Set(names.map(n => n.trim()).filter(Boolean)));
}

/* ------------------------------------------------------------------
   GET /api/projects
   Query params:
     - page (default 1)
     - limit (default 12, max 100)
     - tag  (filter by tag name)
     - search (search in title and description)
     - includeArchived=true to include archived projects
   Returns: { items, page, limit, total }
------------------------------------------------------------------ */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || "12", 10)));
    const tag = req.query.tag ? String(req.query.tag).trim() : null;
    const search = req.query.search ? String(req.query.search).trim() : null;
    const includeArchived = String(req.query.includeArchived).toLowerCase() === "true";

    console.log(`GET /api/projects - page=${page} limit=${limit} tag=${tag || "-"} search=${search || "-"}`);

    const q = {};
    if (!includeArchived) q.archived = { $ne: true };

    if (tag) {
      // match where tags array contains the tag string
      q.tags = tag;
    }

    if (search) {
      q.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      Project.countDocuments(q).exec(),
      Project.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
    ]);

    // normalize tags to names for each project
    const normalized = await Promise.all(items.map(async p => {
      p.tags = await normalizeTags(p.tags || []);
      return p;
    }));

    return res.json({ items: normalized, page, limit, total });
  } catch (err) {
    console.error("GET /api/projects error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ------------------------------------------------------------------
   GET /api/projects/:id
   Accepts either a Mongo ObjectId or a slug field
------------------------------------------------------------------ */
router.get("/:id", async (req, res) => {
  try {
    const idOrSlug = String(req.params.id);
    console.log("GET /api/projects/:id ->", idOrSlug);

    let project = null;
    if (mongoose.isValidObjectId(idOrSlug)) {
      project = await Project.findById(idOrSlug).lean().exec();
    }
    if (!project) {
      project = await Project.findOne({ slug: idOrSlug }).lean().exec();
    }
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.tags = await normalizeTags(project.tags || []);
    return res.json(project);
  } catch (err) {
    console.error("GET /api/projects/:id error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ------------------------------------------------------------------
   POST /api/projects
   Protected by auth middleware
   Body: { title, description, imageUrl, projectUrl, tags }
------------------------------------------------------------------ */
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, imageUrl, projectUrl, tags } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const cleanTags = await normalizeTags(tags || []);

    const project = new Project({
      title: String(title).trim(),
      description: description ? String(description) : "",
      imageUrl: imageUrl ? String(imageUrl) : "",
      projectUrl: projectUrl ? String(projectUrl) : "",
      tags: cleanTags
    });

    const saved = await project.save();
    console.log("POST /api/projects created:", saved._id);
    return res.status(201).json(saved);
  } catch (err) {
    console.error("POST /api/projects error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ------------------------------------------------------------------
   PUT /api/projects/:id
   Protected by auth middleware
   Body fields are optional; tags will be normalized
------------------------------------------------------------------ */
router.put("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid project id" });

    const { title, description, imageUrl, projectUrl, tags } = req.body || {};
    const cleanTags = await normalizeTags(tags || []);

    const update = {
      ...(title ? { title: String(title).trim() } : {}),
      ...(description !== undefined ? { description: String(description) } : {}),
      ...(imageUrl !== undefined ? { imageUrl: String(imageUrl) } : {}),
      ...(projectUrl !== undefined ? { projectUrl: String(projectUrl) } : {}),
      tags: cleanTags,
      updatedAt: new Date()
    };

    const updated = await Project.findByIdAndUpdate(id, update, { new: true }).lean().exec();
    if (!updated) return res.status(404).json({ message: "Project not found" });

    updated.tags = await normalizeTags(updated.tags || []);
    console.log("PUT /api/projects/:id updated:", id);
    return res.json(updated);
  } catch (err) {
    console.error("PUT /api/projects/:id error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ------------------------------------------------------------------
   DELETE /api/projects/:id
   Protected by auth middleware
------------------------------------------------------------------ */
router.delete("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid project id" });

    const removed = await Project.findByIdAndDelete(id).lean().exec();
    if (!removed) return res.status(404).json({ message: "Project not found" });

    console.log("DELETE /api/projects/:id removed:", id);
    return res.json({ message: "Deleted", id });
  } catch (err) {
    console.error("DELETE /api/projects/:id error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
