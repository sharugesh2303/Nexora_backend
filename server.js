import 'dotenv/config'; 
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// ===== ROUTES (ESM imports) =====
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

// --------------------
// App & config
// --------------------
const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Trust proxy is required for Vercel/Heroku to identify the original IP
app.set("trust proxy", 1);
app.disable("x-powered-by"); 

console.log("Starting server from:", process.cwd());
console.log("NODE_ENV:", process.env.NODE_ENV || "development");

// =======================
//  CORS CONFIGURATION (FIXED)
// =======================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://nexoracrew.com",
  "https://www.nexoracrew.com",
  "https://nexora-frontend-kappa.vercel.app",
  // Safely include env vars only if they exist
  process.env.ADMIN_ORIGIN,
  process.env.FRONTEND_ORIGIN
].filter(Boolean); // Removes undefined/null values

console.log("✅ Allowed CORS origins:", allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow requests with no origin (like mobile apps, Postman, or server-to-server)
    if (!origin) return callback(null, true);

    // 2. Check exact match
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // 3. Check dynamic subdomains (Vercel, Koyeb, Netlify)
    // Using strict string ending prevents "malicious-nexora.com" from passing
    const isAllowedProvider = 
      origin.endsWith(".vercel.app") || 
      origin.endsWith(".koyeb.app") || 
      origin.endsWith(".netlify.app");

    if (isAllowedProvider) {
      return callback(null, true);
    }

    // 4. Block everything else
    console.warn(`🚫 BLOCKED BY CORS: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
};

// Apply CORS middleware
app.use(cors(corsOptions));
// Explicitly handle preflight (OPTIONS) requests for all routes
app.options(/.*/, cors(corsOptions));

// =======================
//  SECURITY & LOGGING
// =======================
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// =======================
//  BODY PARSING
// =======================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// =======================
//  DATABASE CONNECTION
// =======================
(async () => {
  try {
    // CRITICAL: Ensure MONGO_URI is set in Vercel Settings
    const uri = process.env.MONGO_URI;

    if (!uri) {
        console.error("❌ CRITICAL ERROR: MONGO_URI is missing in environment variables.");
        // We do not fallback to localhost in production because Vercel has no local DB.
        if (process.env.NODE_ENV === 'production') {
            throw new Error("MONGO_URI is required in production");
        }
    }

    const connectionString = uri || "mongodb://127.0.0.1:27017/nexora";
    
    await mongoose.connect(connectionString, { autoIndex: true });
    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err?.message || err);
    // Do not process.exit(1) on Vercel, it restarts the server endlessly. 
    // Just log it so you can see it in Vercel logs.
  }
})();

// =======================
//  API ROUTES
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
//  HEALTH & ROOT
// =======================
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "🚀 NEXORA API is running!",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// =======================
//  ERROR HANDLING
// =======================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    message: `404 Not Found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error("⚠️ Global Error:", err?.message || err);

  // Handle CORS errors specifically
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ 
        message: "CORS Blocked: Origin not allowed",
        error: "CORS_ERROR"
    });
  }

  res.status(500).json({ 
      message: err?.message || "Internal server error" 
  });
});

// =======================
//  START SERVER
// =======================
const server = app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// Graceful Shutdown
const graceful = async (signal) => {
  console.log(`\n${signal} received. Closing server...`);
  server.close(() => console.log("HTTP server closed."));
  await mongoose.disconnect();
  console.log("MongoDB disconnected.");
  process.exit(0);
};

process.on("SIGINT", () => graceful("SIGINT"));
process.on("SIGTERM", () => graceful("SIGTERM"));