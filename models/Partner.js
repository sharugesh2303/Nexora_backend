import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    description: "Used for Admin reference and image alt text"
  },
  logoUrl: {
    type: String,
    required: true,
    trim: true,
    description: "Direct URL to the partner logo image"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Partner', partnerSchema);