const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");

const {
  generateItinerary,
  optimizeItinerary,
  getTravelSuggestions,
  getDestinationInsights,
  getRecommendations,
 
  
} = require("../controllers/aiController");

const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// AI Rate Limiter
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many AI requests. Please try again later.",
  },
});

// Generate Itinerary Validation
const generateItineraryValidation = [
  body("destination").trim().notEmpty().withMessage("Destination is required"),

  body("duration")
    .isInt({ min: 1, max: 30 })
    .withMessage("Duration must be between 1 and 30 days"),

  body("budget.min")
    .optional()
    .isNumeric()
    .withMessage("Minimum budget must be a valid number"),

  body("budget.max")
    .optional()
    .isNumeric()
    .withMessage("Maximum budget must be a valid number"),

  body("groupSize")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Group size must be between 1 and 20"),
];

// Destination Validation
const destinationValidation = [
  body("destination").trim().notEmpty().withMessage("Destination is required"),
];

// Travel Suggestions Validation
const travelSuggestionsValidation = [
  body("destination").optional().trim(),

  body("budget").optional().isNumeric().withMessage("Budget must be a number"),
];

// Routes

router.post(
  "/generate-itinerary",
  aiLimiter,
  protect,
  generateItineraryValidation,
  validate,
  generateItinerary,
);

router.post("/optimize-itinerary", aiLimiter, protect, optimizeItinerary);

router.post(
  "/travel-suggestions",
  aiLimiter,
  protect,
  travelSuggestionsValidation,
  validate,
  getTravelSuggestions,
);

router.post(
  "/destination-insights",
  aiLimiter,
  protect,
  destinationValidation,
  validate,
  getDestinationInsights,
);

router.get("/recommendations", aiLimiter, protect, getRecommendations);

router.post(
  "/recommendations/refresh",
  aiLimiter,
  protect,
  getRecommendations,
);

module.exports = router;
