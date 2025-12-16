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

// Trust proxy is required for Vercel/Heroku
app.set("trust proxy", 1);
app.disable("x-powered-by"); 

console.log("Starting server...");
console.log("NODE_ENV:", process.env.NODE_ENV || "development");

// =======================
//  CORS CONFIGURATION
// =======================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://nexoracrew.com",
  "https://www.nexoracrew.com",
  "https://nexora-frontend-kappa.vercel.app",
  process.env.ADMIN_ORIGIN,
  process.env.FRONTEND_ORIGIN
].filter(Boolean);

console.log("✅ Allowed CORS origins:", allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);

    const isAllowedProvider = 
      origin.endsWith(".vercel.app") || 
      origin.endsWith(".koyeb.app") || 
      origin.endsWith(".netlify.app");

    if (isAllowedProvider) return callback(null, true);

    console.warn(`🚫 BLOCKED BY CORS: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // Fix for Node 22

// =======================
//  🚀 INSTANT SPEED CACHING
// =======================
// This middleware makes your site load instantly by caching responses
app.use((req, res, next) => {
  // Only cache data fetching (GET), never cache login/updates (POST/PUT)
  if (req.method === 'GET') {
    // browser cache: 5 min, cdn cache: 1 hour, background update: yes
    res.set('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate');
  }
  next();
});

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
//  OPTIMIZED DATABASE CONNECTION
// =======================
let isConnected = false; 

const connectDB = async () => {
  if (isConnected) return; 

  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      const errorMsg = "❌ FATAL: MONGO_URI is missing in environment variables.";
      console.error(errorMsg);
      if (process.env.NODE_ENV === 'production') throw new Error(errorMsg); 
    }

    const connectionString = uri || "mongodb://127.0.0.1:27017/nexora";

    console.log("⏳ Connecting to MongoDB...");
    
    // 5-second timeout to fail fast if connection is blocked
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000, 
      autoIndex: true,
    });

    isConnected = true;
    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);
  }
};

// Connect immediately
connectDB();

// =======================
//  API ROUTES
// =======================
// Ensure DB is connected before handling requests
app.use(async (req, res, next) => {
  if (!isConnected) {
    await connectDB();
  }
  next();
});

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
    db: isConnected ? "connected" : "disconnected",
    uptime: process.uptime(),
  });
});

// =======================
//  ERROR HANDLING
// =======================
app.use((req, res) => {
  res.status(404).json({
    message: `404 Not Found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, _req, res, _next) => {
  console.error("⚠️ Error:", err.message);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS Blocked" });
  }

  res.status(500).json({ 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined 
  });
});

// =======================
//  START SERVER
// =======================
const server = app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

const graceful = async (signal) => {
  console.log(`\n${signal} received. Closing server...`);
  server.close(() => console.log("HTTP server closed."));
  if (isConnected) {
      await mongoose.disconnect();
      console.log("MongoDB disconnected.");
  }
  process.exit(0);
};

process.on("SIGINT", () => graceful("SIGINT"));
process.on("SIGTERM", () => graceful("SIGTERM"));