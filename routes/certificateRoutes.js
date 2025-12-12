import express from 'express';
import Certificate from '../models/Certificate.js';
import { upload, cloudinary } from '../config/cloudinaryConfig.js';
import stream from 'stream';

const router = express.Router();

// =================================================================
// 1. UPLOAD CERTIFICATE (Manual Stream Method)
// =================================================================
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    // 1. Validate that the file actually arrived in memory
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No file uploaded or file is empty' });
    }

    const { certificateID, studentName, issueDate } = req.body;
    if (!certificateID || !studentName) {
      return res.status(400).json({ success: false, message: 'Certificate ID and Name are required' });
    }

    // 2. Generate a clean filename that definitely ends in .pdf
    const safeId = certificateID.replace(/[^a-zA-Z0-9-_]/g, ''); 
    const publicId = `nexora_certificates/${safeId}_${Date.now()}.pdf`;

    // 3. Create the Upload Promise
    const uploadStreamPromise = () => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: 'raw', // MUST be 'raw' for PDFs
            format: 'pdf',        // Explicitly tell Cloudinary this is a PDF
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );

        // Pipe the file buffer (from memory) into the upload stream
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);
        bufferStream.pipe(uploadStream);
      });
    };

    // 4. Execute Upload
    const result = await uploadStreamPromise();

    // 5. Save to MongoDB
    const cert = new Certificate({
      certificateID: certificateID.toUpperCase().trim(), // Ensure uppercase and trimmed
      studentName,
      pdfUrl: result.secure_url,
      publicId: result.public_id,
      resourceType: 'raw',
      issueDate: issueDate ? new Date(issueDate) : Date.now(),
    });

    await cert.save();

    return res.status(201).json({ success: true, data: cert });

  } catch (error) {
    console.error('Upload Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Certificate ID already exists' });
    }
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// =================================================================
// 2. VERIFY CERTIFICATE (The Missing Route)
// =================================================================
router.get('/verify/:id', async (req, res) => {
  try {
    const certId = req.params.id.trim();

    // Search case-insensitive (or force uppercase if you store them that way)
    // Using case-insensitive regex ensures "nex-001" finds "NEX-001"
    const cert = await Certificate.findOne({ 
      certificateID: { $regex: new RegExp(`^${certId}$`, 'i') } 
    });

    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    return res.status(200).json({ success: true, data: cert });

  } catch (err) {
    console.error("Verify Error:", err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// =================================================================
// 3. GET ALL CERTIFICATES
// =================================================================
router.get('/', async (req, res) => {
  try {
    const list = await Certificate.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
});

// =================================================================
// 4. DELETE CERTIFICATE
// =================================================================
router.delete('/:id', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, message: 'Not found' });

    // Delete from Cloudinary
    if (cert.publicId) {
      try {
        await cloudinary.uploader.destroy(cert.publicId, { resource_type: 'raw' });
      } catch (e) {
        console.warn('Cloudinary delete warning:', e.message);
      }
    }

    await cert.deleteOne();
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;