// models/Certificate.js
import mongoose from 'mongoose';

const CertificateSchema = new mongoose.Schema({
  certificateID: { type: String, required: true, unique: true, trim: true, uppercase: true },
  studentName: { type: String, required: true, trim: true },
  pdfUrl: { type: String, required: true },   // secure_url
  publicId: { type: String, required: true }, // cloudinary public_id
  resourceType: { type: String, default: 'raw' },
  issueDate: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Certificate', CertificateSchema);
