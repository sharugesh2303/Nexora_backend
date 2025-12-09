// server.js (Unified with ESM imports, Security, CORS, Milestones, and Stories)

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";

// Load environment variables
dotenv.config();

// =======================
// IMPORT ROUTES 
// (CRUCIAL: Ensure filenames match exactly in your routes directory)
// =======================
import authRoutes from "./routes/authRoutes.js";
import contentRoutes from "./routes/contentRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import tagRoutes from "./routes/tagRoutes.js";
import milestoneRoutes from "./routes/milestones.js";
import storyRoutes from "./routes/storyRoutes.js"; // Story Route Import

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

console.log("Starting server from:", process.cwd());
app.set("trust proxy", 1);

// =======================
//  DATABASE CONNECTION
// =======================
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

// =======================
//  MIDDLEWARE: SECURITY & LOGGING
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
  process.env.ADMIN_ORIGIN, // optional
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (server-to-server, curl, Postman)
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

// 1. Add Private Network Access (PNA) header logic
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
  } catch (e) {
    /* ignore */
  }
  next();
});

// 2. Apply general CORS for all actual requests (including preflight options)
app.use(cors(corsOptions));

// =======================
//  BODY PARSING
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================
//  API ROUTES (mount)
// =======================
app.use("/api/auth", authRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/milestones", milestoneRoutes);

// STORIES – main path and backwards-compatible alias
app.use("/api/stories", storyRoutes);        // main path
app.use("/api/client-stories", storyRoutes); // alias used by old frontend code

// =======================
//  HEALTH & ROOT ROUTES
// =======================
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "🚀 Welcome to the NEXORA API. The server is alive and running!",
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// optional route-inspector for non-production
if (process.env.NODE_ENV !== "production") {
  app.get("/__routes", (_req, res) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        const method = Object.keys(middleware.route.methods)[0].toUpperCase();
        routes.push(`${method} ${middleware.route.path}`);
      } else if (middleware.name === "router") {
        middleware.handle.stack.forEach((handler) => {
          const route = handler.route;
          if (route) {
            const method = Object.keys(route.methods)[0].toUpperCase();
            routes.push(`${method} ${route.path}`);
          }
        });
      }
    });
    res.json({ routes });
  });
}

// =======================
//  404 CATCH-ALL ROUTE 🚨
// =======================
app.use((req, res) => {
  res.status(404).json({
    message: `404 Not Found: Cannot ${req.method} ${req.originalUrl}`,
  });
});

// =======================
//  ERROR HANDLING
// =======================
/* eslint-disable no-unused-vars */
app.use((err, _req, res, _next) => {
  console.error(
    "⚠️ Error Handler:",
    err && err.message ? err.message : err
  );
  if (String(err?.message || "").startsWith("Not allowed by CORS")) {
    return res.status(403).json({ message: err.message });
  }
  res.status(500).json({ message: err?.message || "Internal server error" });
});
/* eslint-enable no-unused-vars */

// =======================
//  GLOBAL ERROR & EXIT HANDLERS
// =======================
process.on("unhandledRejection", (err) => {
  console.error(
    "💥 Unhandled Rejection:",
    err && err.message ? err.message : err
  );
  if (process.env.NODE_ENV === "production") process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error(
    "💣 Uncaught Exception:",
    err && err.stack ? err.stack : err
  );
  if (process.env.NODE_ENV === "production") process.exit(1);
});

// =======================
//  START SERVER
// =======================
app.listen(PORT, HOST, () => {
  console.log(`🌐 Server running on http://${HOST}:${PORT}`);
});
