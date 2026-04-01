const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

require("dotenv").config();

const opsRoutes = require("./routes/opsRoutes");
const logRoutes = require("./routes/logRoutes"); // ✅ IMPORTANT

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Routes
app.use("/api", opsRoutes);
app.use("/api/logs", logRoutes); // Backward-compatible alias for analyze

// Health check
app.get("/", (_req, res) => {
  res.json({
    success: true,
    service: "Autonomous AI DevOps Engineer API",
    version: "1.0.0",
    endpoints: [
      "POST /api/analyze",
      "POST /api/logs/analyze",
      "POST /api/logs",
      "GET /api/status",
      "GET /api/stats"
    ],
  });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

module.exports = app;