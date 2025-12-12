import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: 'doz4sfwg7', 
  api_key: '356453168349345',       
  api_secret: 'jVA1ZOY0_JDz_pnvPY81sEEqazU', 
});

// CRITICAL CHANGE: Use memoryStorage
// This holds the file in RAM so we can stream it manually without corruption.
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

export { cloudinary, upload };