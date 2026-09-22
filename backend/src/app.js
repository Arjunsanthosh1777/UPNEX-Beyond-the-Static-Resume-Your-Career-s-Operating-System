import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import storageRoutes from "./routes/storageRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import clashRoutes from "./routes/clashRoutes.js";
import { ogHandler } from "./og.js";
import multer from "multer";

const app = express();

// Comma-separated CORS_ORIGINS overrides the default; the frontend always
// ships from localhost for local dev, and a hosted build reaches the API
// cross-origin from whatever origin CLIENT_URL points at.
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: corsOrigins.length ? corsOrigins : [
    process.env.CLIENT_URL ||
    (process.env.NODE_ENV === "production" ? process.env.RENDER_EXTERNAL_URL : undefined) ||
    "http://localhost:5173",
    "http://localhost:5173",
    "http://localhost:4173"
  ],
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

// Credential and sign-in probes get a much tighter window than general
// traffic. GETs (session restore via /me) stay unlimited so browsing around
// never trips a login guard and kicks a signed-in user out.
const authLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, skip: (req) => req.method === "GET" });
const verifyLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 120 });

app.get("/api/health", (req, res) => res.json({ status: "UPNEX API online" }));
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", verifyLimiter, publicRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/clash", clashRoutes);

// Public assets (branded OG image) and the crawler metadata shell, then - in
// production where a frontend build exists next door - SPA static serving.
// Note: express.static is mounted at the root, not under "/og" - Express 5
// fails to strip a "/og" mount prefix for static files and 404s every file.
const backendDir = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.resolve(backendDir, "../public")));
app.use(ogHandler);

const frontendDist = path.resolve(backendDir, "../../frontend/dist");
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(frontendDist, "index.html"));
    }
    next();
  });
}

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Documents must be smaller than 10 MB." });
    }
    return res.status(400).json({ message: "Could not read the uploaded file." });
  }

  // Invalid request bodies surface as ZodError from schema.parse(); map them
  // to a 400 with the offending fields instead of a generic 500.
  if (err instanceof ZodError) {
    const fields = err.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message
    }));
    return res.status(400).json({ message: "Invalid request data.", fields });
  }

  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error." });
});

export default app;