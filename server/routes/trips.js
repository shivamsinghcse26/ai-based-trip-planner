const express = require("express");
const { body } = require("express-validator");

const {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  cloneTrip,
} = require("../controllers/tripController");

const { protect } = require("../middleware/auth");

const router = express.Router();

// Create Trip Validation
const tripValidation = [
  body("title")
    .notEmpty()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("destination.city")
    .notEmpty()
    .trim()
    .withMessage("Destination city is required"),

  body("destination.country")
    .notEmpty()
    .trim()
    .withMessage("Destination country is required"),

  body("preferences.duration")
    .isInt({ min: 1, max: 365 })
    .withMessage("Duration must be between 1 and 365 days"),
];

// Update Trip Validation
const updateTripValidation = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),
];

// Get All Trips
router.get("/", protect, getTrips);

// Create Trip
router.post("/", protect, tripValidation, createTrip);

// Get Single Trip
router.get("/:id", protect, getTripById);

// Update Trip
router.put("/:id", protect, updateTripValidation, updateTrip);

// Delete Trip
router.delete("/:id", protect, deleteTrip);



module.exports = router;
