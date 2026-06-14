const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");

const {
  register,
  login,
  refresh,
  logout,
  changePassword,
  getMe,
  updateProfile,
} = require("../controllers/authControllerNew");

const { protect } = require("../middleware/auth");

const router = express.Router();

// Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Register Validation
const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

// Login Validation
const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password").notEmpty().withMessage("Password is required"),
];

//Change Password Validation
const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

// Register
router.post("/register", authLimiter, registerValidation, register);

// Login
router.post("/login", authLimiter, loginValidation, login);

// Refresh Token
router.post("/refresh", refresh);

// Current User
router.get("/me", protect, getMe);

// Update Profile
router.put("/profile", protect, updateProfile);

// Change Password
router.post("/change-password",protect,changePasswordValidation,changePassword);

// Logout
router.post("/logout", protect, logout);

module.exports = router;
