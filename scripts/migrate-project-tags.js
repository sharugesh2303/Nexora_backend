// backend/scripts/migrate-project-tags.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../models/Project.js';
import Tag from '../models/Tag.js';

dotenv.config();

async function normalizeTagNames(mixed = []) {
  if (!Array.isArray(mixed)) return [];
  const names = [];
  const ids = [];

  for (const item of mixed) {
    if (!item && item !== 0) continue;
    if (typeof item === 'object' && item !== null) {
      if (item.name) { names.push(String(item.name).trim()); continue; }
      if (item._id && mongoose.isValidObjectId(String(item._id))) { ids.push(String(item._id)); continue; }
    }
    if (typeof item === 'string') {
      const s = item.trim();
      if (!s) continue;
      if (mongoose.isValidObjectId(s)) ids.push(s);
      else names.push(s);
      continue;
    }
    names.push(String(item));
  }

  if (ids.length) {
    const docs = await Tag.find({ _id: { $in: ids } }).select('name').lean();
    docs.forEach(d => { if (d && d.name) names.push(String(d.name).trim()); });
  }

  return Array.from(new Set(names.filter(Boolean)));
}

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});

    const projects = await Project.find();
    console.log(`Found ${projects.length} projects.`);

    for (const p of projects) {
      const original = p.tags || [];
      const normalized = await normalizeTagNames(original);

      // If different, update and save
      const same = JSON.stringify(normalized) === JSON.stringify(p.tags || []);
      if (!same) {
        p.tags = normalized;
        await p.save();
        console.log(`[migrated] Project ${p._id} => tags:`, normalized);
      } else {
        console.log(`[skipped] Project ${p._id} (already normalized)`);
      }
    }

    console.log('Migration complete.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration error', err);
    process.exit(1);
  }
}

migrate();
