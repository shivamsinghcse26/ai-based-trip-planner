const helmet = require("helmet");

const rateLimit = require("express-rate-limit");

const mongoSanitize = require(
  "express-mongo-sanitize"
);

const xss = require("xss-clean");

const hpp = require("hpp");

const setupSecurity = (app) => {
  // Trust Proxy
  app.set("trust proxy", 1);

  // Security Headers
  app.use(helmet());

  // Prevent NoSQL Injection
  app.use(mongoSanitize());

  // Prevent XSS
  app.use(xss());

  // Prevent HTTP Parameter Pollution
  app.use(hpp());

  // Global Rate Limiter
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    max: 100,

    message: {
      success: false,
      message:
        "Too many requests. Please try again later.",
    },
  });

  app.use("/api", limiter);
};

module.exports = setupSecurity;