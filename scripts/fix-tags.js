import mongoose from "mongoose";
import dotenv from "dotenv";
import Tag from "../models/Tag.js";
import Project from "../models/Project.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("Cleaning corrupted tags...");

  const tags = await Tag.find();

  for (const t of tags) {
    let name = t.name;

    if (typeof name === "object") {
      console.log("Fixing tag:", t._id);
      name = JSON.stringify(name);
    }

    if (name.includes("[object Object]")) {
      name = "Unknown";
    }

    const slug = name.toLowerCase().replace(/\s+/g, "-");

    t.name = name;
    t.slug = slug;

    await t.save();
  }

  console.log("Fixing project tags...");

  const projects = await Project.find();

  for (const p of projects) {
    const clean = [];

    for (const tag of p.tags || []) {
      if (typeof tag === "object" && tag.name) clean.push(tag.name);
      else if (typeof tag === "string") clean.push(tag);
    }

    p.tags = clean;
    await p.save();
  }

  console.log("Done cleaning.");
  process.exit(0);
}

run();
