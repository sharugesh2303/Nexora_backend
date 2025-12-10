import 'dotenv/config'; // 👈 CRITICAL FIX: Loads .env before any other imports
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

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

console.log("Starting server from:", process.cwd());
console.log("NODE_ENV:", process.env.NODE_ENV || "development");

// Proxy trust for production (Koyeb/Vercel/Heroku)
app.set("trust proxy", 1);

// =======================
//  DATABASE CONNECTION
// =======================
(async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nexora";

    if (!process.env.MONGO_URI) {
      console.warn(
        `⚠️ MONGO_URI not found in .env. Using fallback local URI: ${uri}`
      );
    }

    await mongoose.connect(uri);
    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err?.message || err);
    process.exit(1);
  }
})();

// =======================
//  SECURITY & LOGGING
// =======================
app.use(helmet());
app.use(morgan("dev"));

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
].filter(Boolean);

console.log("Allowed CORS origins:", allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (server-to-server, Postman, curl)
    if (!origin) return callback(null, true);

    try {
      const isAllowed =
        allowedOrigins.includes(origin) ||
        String(origin).endsWith(".vercel.app") ||
        String(origin).endsWith(".koyeb.app");

      if (isAllowed) return callback(null, true);

      console.warn(`🚫 Blocked by CORS: ${origin}`);
      return callback(new Error(`Not allowed by CORS: ${origin}`), false);
    } catch (err) {
      console.warn("CORS check error:", err);
      return callback(new Error("CORS check failed"), false);
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// =======================
//  BODY PARSING
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// =======================
//  HEALTH & ROOT
// =======================
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "🚀 Welcome to the NEXORA API. The server is alive and running!",
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
//  404 CATCH-ALL
// =======================
app.use((req, res) => {
  res.status(404).json({
    message: `404 Not Found: Cannot ${req.method} ${req.originalUrl}`,
  });
});

// =======================
//  ERROR HANDLER
// =======================
app.use((err, _req, res, _next) => {
  console.error("⚠️ Error Handler:", err?.message || err);
  if (String(err?.message || "").startsWith("Not allowed by CORS")) {
    return res.status(403).json({ message: err.message });
  }
  res.status(500).json({ message: err?.message || "Internal server error" });
});

// =======================
//  START SERVER
// =======================
app.listen(PORT, HOST, () => {
  console.log(`🌐 Server running on http://${HOST}:${PORT}`);
});