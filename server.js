// server.js
import 'dotenv/config'; // CRITICAL: load .env first (server-side only)
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// ===== ROUTES (ESM imports) =====
// Make sure these files exist and export routers
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
import certificateRoutes from "./routes/certificateRoutes.js"; // Certificates route

// --------------------
// Basic env validation
// --------------------
const requiredEnvs = [
  "MONGO_URI",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
];

const missing = requiredEnvs.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn("⚠️ Missing recommended env vars:", missing.join(", "));
}

// --------------------
// App & config
// --------------------
const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

console.log("Starting server from:", process.cwd());
console.log("NODE_ENV:", process.env.NODE_ENV || "development");

// trust proxy for proper client IP when behind proxies/load balancers
app.set("trust proxy", 1);
app.disable("x-powered-by"); // don't reveal server stack

// =======================
//  DATABASE CONNECTION
// =======================
(async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nexora" || "https://finance.nexoracrew.com";

    if (!process.env.MONGO_URI) {
      console.warn(`⚠️ MONGO_URI not found in .env. Using fallback local URI: ${uri}`);
    }

    // Mongoose connect
    await mongoose.connect(uri, { autoIndex: true });
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
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// =======================
//  CORS CONFIGURATION
// =======================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://nexoracrew.com",
  "https://www.nexoracrew.com",
  "https://nexora-frontend-kappa.vercel.app",
  "https://finance.nexoracrew.com",
  process.env.ADMIN_ORIGIN,
  process.env.FRONTEND_ORIGIN
].filter(Boolean);

console.log("Allowed CORS origins:", allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // allow server-to-server requests (no origin)
    if (!origin) return callback(null, true);

    try {
      // normalize the incoming origin host (host:port)
      let incomingHost;
      try {
        incomingHost = new URL(origin).host;
      } catch {
        incomingHost = origin;
      }

      // allow if any allowedOrigins entry matches the origin or its host
      const isAllowed = allowedOrigins.some((allowed) => {
        if (!allowed) return false;
        // if user provided a full URL in allowedOrigins
        try {
          const allowedHost = new URL(allowed).host;
          if (allowedHost === incomingHost) return true;
        } catch {
          // not a full URL in allowedOrigins, fallback to endsWith match or exact match
        }
        if (typeof allowed === 'string' && (origin === allowed || origin.endsWith(allowed) || incomingHost.endsWith(allowed))) {
          return true;
        }
        return false;
      }) ||
      // common hosting wildcard allow
      incomingHost.endsWith(".vercel.app") ||
      incomingHost.endsWith(".koyeb.app") ||
      incomingHost.endsWith(".netlify.app");

      if (isAllowed) return callback(null, true);

      console.warn(`🚫 Blocked by CORS: ${origin}`);
      return callback(new Error(`Not allowed by CORS: ${origin}`), false);
    } catch (err) {
      console.warn("CORS check error:", err);
      return callback(new Error("CORS check failed"), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// =======================
//  BODY PARSING (limits)
// =======================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
//  START SERVER (graceful shutdown)
// =======================
const server = app.listen(PORT, HOST, () => {
  console.log(`🌐 Server running on http://${HOST}:${PORT}`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`Open http://localhost:${PORT} for local testing`);
  }
});

const graceful = async (signal) => {
  try {
    console.log(`\n${signal} received — closing server...`);
    // stop accepting new connections
    server.close(() => {
      console.log("HTTP server closed.");
    });

    // give a small grace period for existing connections
    const graceMs = 3000;
    await new Promise((resolve) => setTimeout(resolve, graceMs));

    // close mongoose connection
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");

    // exit cleanly
    process.exit(0);
  } catch (err) {
    console.error("Error during graceful shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => graceful("SIGINT"));
process.on("SIGTERM", () => graceful("SIGTERM"));

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err && (err.stack || err));
  // attempt graceful shutdown, then exit
  graceful("uncaughtException").catch(() => process.exit(1));
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // optional: decide whether to shutdown depending on your tolerance
});
