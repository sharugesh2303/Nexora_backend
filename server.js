// server.js (Unified, Hardened, Route-Verified)
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

import authRoutes from "./routes/authRoutes.js";
import contentRoutes from "./routes/contentRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import tagRoutes from "./routes/tagRoutes.js";
import milestoneRoutes from "./routes/milestones.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import faqsRoutes from "./routes/faqs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

console.log("Starting server from:", process.cwd());
app.set("trust proxy", 1);

// ===== DATABASE =====
(async () => {
  try {
    if (!process.env.MONGO_URI) {
      const fallbackUri = "mongodb://127.0.0.1:27017/nexora";
      console.warn(`⚠️ MONGO_URI not found in .env. Using fallback: ${fallbackUri}`);

      if (process.env.NODE_ENV === "production") {
        console.error("No MONGO_URI set in environment. Aborting.");
        process.exit(1);
      }
      await mongoose.connect(fallbackUri);
    } else {
      await mongoose.connect(process.env.MONGO_URI);
    }

    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err?.message || err);
    console.log("Make sure MONGO_URI is set in your .env or hosting secrets.");
    process.exit(1);
  }
})();

// ===== MIDDLEWARE =====
app.use(helmet());
app.use(morgan("dev"));

// ===== CORS CONFIG =====
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://nexoracrew.com",
  "https://www.nexoracrew.com",
  "https://nexora-frontend-kappa.vercel.app",
  process.env.ADMIN_ORIGIN,
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Debugging: log incoming origin header (helpful in hosted envs)
    console.debug("CORS check - incoming origin:", origin);

    // allow non-browser or same-origin (e.g., Postman or server-to-server)
    if (!origin) return callback(null, true);

    try {
      const isAllowed =
        allowedOrigins.includes(origin) ||
        String(origin).endsWith(".vercel.app") ||
        String(origin).endsWith(".koyeb.app");

      console.debug("CORS check - origin:", origin, "isAllowed:", isAllowed);

      if (isAllowed) return callback(null, true);
      return callback(new Error(`Not allowed by CORS: ${origin}`), false);
    } catch (err) {
      console.warn("CORS check error:", err);
      return callback(new Error("CORS check failed"), false);
    }
  },
  credentials: true,
};

// Add Private Network Access header for PNA requests (helpful for some hosted envs)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  try {
    const isAllowed =
      !origin ||
      allowedOrigins.includes(origin) ||
      String(origin).endsWith(".vercel.app") ||
      String(origin).endsWith(".koyeb.app");
    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Private-Network", "true");
    }
  } catch (e) {}
  next();
});

app.use(cors(corsOptions));

// ===== PARSERS =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== MOUNT API ROUTES (IMPORTANT: mount /api BEFORE static and SPA catch-all) =====
app.use("/api/auth", authRoutes);
app.use("/api/content", contentRoutes);           // note: contentRoutes can also mount sub-routes
app.use("/api/content/faqs", faqsRoutes);         // dedicated FAQ endpoints
app.use("/api/messages", messageRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/schedule", scheduleRoutes);

// ===== OPTIONAL: Serve frontend static build if hosting API + SPA on same server =====
if (process.env.SERVE_STATIC === "true") {
  const buildDir = path.join(__dirname, "client", "build"); // adjust to your build path
  app.use(express.static(buildDir));
  // Ensure API is mounted before this catch-all
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildDir, "index.html"));
  });
}

// ===== HEALTH & ROOT =====
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "🚀 Welcome to the NEXORA API. The server is alive and running!",
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ message: `404 Not Found: Cannot ${req.method} ${req.originalUrl}` });
});

// ===== ERROR HANDLER =====
app.use((err, _req, res, _next) => {
  console.error("⚠️ Error Handler:", err && err.message ? err.message : err);
  if (String(err?.message || "").startsWith("Not allowed by CORS")) {
    return res.status(403).json({ message: err.message });
  }
  res.status(500).json({ message: err?.message || "Internal server error" });
});

// ===== GLOBAL HANDLERS =====
process.on("unhandledRejection", (err) => {
  console.error("💥 Unhandled Rejection:", err && err.message ? err.message : err);
  if (process.env.NODE_ENV === "production") process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("💣 Uncaught Exception:", err && err.stack ? err.stack : err);
  if (process.env.NODE_ENV === "production") process.exit(1);
});

// ===== START SERVER =====
app.listen(PORT, HOST, () => {
  console.log(`🌐 Server running on http://${HOST}:${PORT}`);
  console.log("➡️  Mounted routes: /api/content, /api/content/faqs, /api/messages, /api/posts, /api/projects, /api/tags, /api/milestones, /api/schedule");
});
