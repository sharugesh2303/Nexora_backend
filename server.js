// server.js (VERCEL SERVERLESS SAFE – NODE 22 COMPATIBLE)

import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// =======================
// ROUTES
// =======================
import authRoutes from "./routes/authRoutes.js";
import contentRoutes from "./routes/contentRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import tagRoutes from "./routes/tagRoutes.js";
import milestoneRoutes from "./routes/milestones.js";
import storyRoutes from "./routes/storyRoutes.js";
import partnerRoutes from "./routes/partnerRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";

// =======================
// ENV VALIDATION
// =======================
const requiredEnvs = [
  "MONGO_URI",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missing = requiredEnvs.filter(k => !process.env[k]);
if (missing.length) {
  console.warn("⚠️ Missing env vars:", missing.join(", "));
}

// =======================
// APP INIT
// =======================
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

console.log("🚀 Nexora API (Vercel Serverless) booted");

// =======================
// MONGODB (SERVERLESS SAFE)
// =======================
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error("❌ MONGO_URI is not defined");

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI, {
      bufferCommands: false,
      maxPoolSize: 5,
    }).then(m => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// Connect DB per request (cached)
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ MongoDB error:", err);
    next(err);
  }
});

// =======================
// SECURITY & LOGGING
// =======================
app.use(helmet());
app.use(morgan("combined"));

// =======================
// ✅ CORS (FIXED, EXPLICIT, NODE 22 SAFE)
// =======================
const ALLOWED_ORIGINS = [
  "https://nexoracrew.com",
  "https://www.nexoracrew.com",
  "https://nexora-frontend-kappa.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // server-to-server

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      console.warn("🚫 CORS blocked:", origin);
      return callback(new Error("CORS blocked"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ SAFE preflight handler (NO "*", Node 22 compatible)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// =======================
// BODY PARSING
// =======================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// =======================
// API ROUTES
// =======================
app.use("/api/auth", authRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/certificates", certificateRoutes);

// =======================
// ROOT & HEALTH
// =======================
app.get("/", (_req, res) => {
  res.json({ message: "🚀 Nexora API is alive" });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// =======================
// 404
// =======================
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// =======================
// ERROR HANDLER
// =======================
app.use((err, _req, res, _next) => {
  console.error("❌ API Error:", err?.message || err);
  res.status(500).json({
    message: err?.message || "Internal server error",
  });
});

// =======================
// EXPORT FOR VERCEL
// =======================
export default app;
