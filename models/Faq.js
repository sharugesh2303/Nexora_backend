// api-server/models/Faq.js
import mongoose from 'mongoose';

const FaqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Default export so `import Faq from '../models/Faq.js'` works
export default mongoose.models.Faq || mongoose.model('Faq', FaqSchema);
