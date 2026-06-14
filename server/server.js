const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "1.0.0.1"]);

const express = require("express");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const cors = require("cors");
const compression = require("compression");
const { connectDB } = require("./config/db");
const security = require("./middleware/security");

// Import routes
const authRoutes = require("./routes/authNew");
const userRoutes = require("./routes/users");
const tripRoutes = require("./routes/trips");
const mapRoutes = require("./routes/maps");
const aiRoutes = require("./routes/ai");

const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200,
};

if (process.env.NODE_ENV === "production" && process.env.ALLOWED_ORIGINS) {
  corsOptions.origin = process.env.ALLOWED_ORIGINS.split(",").map((origin) =>
    origin.trim(),
  );
  console.log("Allowed Origins:", corsOptions.origin);
}

app.use(cors(corsOptions));


// Body parsing middleware with enhanced security
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser()); 


// Security middleware
security(app);

// Compression middleware
app.use(compression());



// Protected API routes 
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/maps", mapRoutes);
app.use("/api/ai", aiRoutes);

// Start server
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV}`);
      console.log(` API: http://localhost:${PORT}/api`);
      console.log(` Health: http://localhost:${PORT}/api/health\n`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });

module.exports = app;
