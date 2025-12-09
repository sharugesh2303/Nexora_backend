// models/Story.js
import mongoose from "mongoose";

const StorySchema = new mongoose.Schema(
  {
    quote: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String, // e.g., "CEO of TechCorp" or "Principal"
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // optional but nice to have
    timestamps: true,
  }
);

const Story = mongoose.model("Story", StorySchema);

export default Story;
