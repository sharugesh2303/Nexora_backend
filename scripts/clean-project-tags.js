import mongoose from "mongoose";
import dotenv from "dotenv";
import Project from "../models/Project.js";
import Tag from "../models/Tag.js";

dotenv.config();

async function normalize(raw) {
  const out = [];
  const ids = [];

  for (const t of raw) {
    if (!t) continue;

    if (typeof t === "object") {
      if (t.name) out.push(t.name);
      else if (t._id) ids.push(t._id);
    } else if (mongoose.isValidObjectId(t)) {
      ids.push(t);
    } else {
      out.push(t);
    }
  }

  if (ids.length) {
    const docs = await Tag.find({ _id: { $in: ids } });
    docs.forEach(d => out.push(d.name));
  }

  return [...new Set(out)];
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const projects = await Project.find();
  for (const p of projects) {
    const clean = await normalize(p.tags || []);
    p.tags = clean;
    await p.save();
    console.log("Updated project:", p.title, clean);
  }

  console.log("DONE.");
  process.exit(0);
}

run();
