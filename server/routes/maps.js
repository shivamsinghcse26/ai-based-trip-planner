const express = require("express");

const freeMapService = require("../services/freeMapService");

const router = express.Router();

// Nearby Places
router.get("/places/nearby", async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const location = `${lat},${lng}`;

    const places = await freeMapService.nearbySearch(location, Number(radius));

    res.json({
      success: true,
      places,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      success: false,
      message: "Error fetching nearby places",
    });
  }
});

// Search Places
router.get("/places/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const places = await freeMapService.searchPlaces(query);

    res.json({
      success: true,
      places,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      success: false,
      message: "Error searching places",
    });
  }
});

// Geocode Address
router.get("/geocode", async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    const result = await freeMapService.geocode(address);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      success: false,
      message: "Error geocoding address",
    });
  }
});

// Reverse Geocode
router.get("/reverse-geocode", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const result = await freeMapService.reverseGeocode(
      Number(lat),
      Number(lng),
    );

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      success: false,
      message: "Error reverse geocoding",
    });
  }
});

// Directions
router.get("/directions", async (req, res) => {
  try {
    const { origin, destination } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: "Origin and destination are required",
      });
    }

    const directions = await freeMapService.getDirections(origin, destination);

    res.json({
      success: true,
      directions,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      success: false,
      message: "Error fetching directions",
    });
  }
});

module.exports = router;
