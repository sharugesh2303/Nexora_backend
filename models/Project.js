// backend/models/Project.js
import mongoose from "mongoose";

/**
 * Project model
 * - title (required)
 * - slug (optional, generated from title if missing)
 * - tags stored as an array of names (strings)
 *
 * This file is defensive:
 * - pre-save hook generates a slug and ensures uniqueness (adds short suffix on collision)
 * - we only add a schema index on slug if it hasn't been declared already on this schema
 * - we export using mongoose.models guard to avoid recompilation warnings
 */

const { Schema } = mongoose;

/** simple slugify */
function slugify(text = "") {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[\s\_]+/g, "-")             // spaces/underscores -> dash
    .replace(/[^a-z0-9\-]+/g, "")         // remove invalid chars
    .replace(/-+/g, "-")                  // collapse dashes
    .replace(/^-+|-+$/g, "");             // trim leading/trailing dashes
}

const ProjectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true }, // generated if absent
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    projectUrl: { type: String, default: "" },
    tags: { type: [String], default: [] }, // store tag NAMES only
    archived: { type: Boolean, default: false },
    date: { type: Date, default: () => new Date() }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/**
 * Pre-save: generate slug if missing and ensure it is unique-ish.
 * We attempt up to N times; on collisions we append a short random suffix.
 */
ProjectSchema.pre("validate", async function (next) {
  try {
    // only run for new docs or when title/slug changed
    if (!this.slug && this.title) {
      this.slug = slugify(this.title);
    } else if (this.isModified("title") && !this.isModified("slug")) {
      // if title changed but slug wasn't explicitly changed, re-generate
      this.slug = slugify(this.title);
    }

    if (!this.slug) return next();

    // ensure slug uniqueness in collection (simple approach)
    // if there's a collision (another doc with same slug and different _id), append suffix
    const Project = mongoose.models.Project || mongoose.model("Project");
    let candidate = this.slug;
    let attempt = 0;
    while (attempt < 6) {
      const query = { slug: candidate };
      if (this._id) query._id = { $ne: this._id }; // exclude self when updating
      // NOTE: use lean false because we just need existence
      // use countDocuments for clarity
      // if count is 0 — unique
      // small race condition possible but acceptable for most use-cases
      // (you could enforce uniqueness at DB-level if desired)
      // eslint-disable-next-line no-await-in-loop
      const exists = await Project.countDocuments(query).exec();
      if (!exists) {
        this.slug = candidate;
        break;
      }
      // collision -> append short suffix
      const suffix = Math.random().toString(36).slice(2, 6); // 4 chars
      candidate = `${this.slug}-${suffix}`;
      attempt += 1;
    }

    // if still colliding after attempts, leave what we have (rare)
    return next();
  } catch (err) {
    return next(err);
  }
});

/**
 * Add slug index only if the schema doesn't already have an index on slug.
 * This prevents "Duplicate schema index" warnings when the file is imported multiple times.
 */
(function ensureSlugIndexOnce() {
  try {
    const existing = ProjectSchema.indexes(); // returns array of [keys, options]
    const hasSlugIndex = existing.some(([keys]) => keys && Object.prototype.hasOwnProperty.call(keys, "slug"));
    if (!hasSlugIndex) {
      // non-unique index to avoid duplicate key errors; you can change to unique:true if desired
      ProjectSchema.index({ slug: 1 }, { background: true });
    }
  } catch (e) {
    // if anything goes wrong here, avoid crashing startup — log and continue
    // mongoose may not be ready in some test runners; don't throw.
    // console.warn("ensureSlugIndexOnce error:", e);
  }
}());

// Prevent model recompilation in dev/hot-reload
const Project = mongoose.models.Project || mongoose.model("Project", ProjectSchema);
export default Project;
