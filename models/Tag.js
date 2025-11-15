// backend/models/Tag.js (FIXED: Duplicate Index Removed)
import mongoose from 'mongoose';

const TagSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true, // <-- Index definition is here
    lowercase: true, 
    trim: true 
  },
  createdAt: { type: Date, default: Date.now }
});

// REMOVED: The following line was the cause of the 'Duplicate schema index' warning:
// TagSchema.index({ slug: 1 }); 
// Because 'unique: true' on the field already implies an index.

export default mongoose.model('Tag', TagSchema);