const { validationResult } = require(
  "express-validator"
);

const freeMapService = require(
  "../services/freeMapService"
);

// Search Places
const searchPlaces = async (
  req,
  res
) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message:
          "Search query is required",
      });
    }

    const places =
      await freeMapService.searchPlaces(
        query
      );

    res.json({
      success: true,
      places,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to search places",
    });
  }
};

// Nearby Places
const getNearbyPlaces =
  async (req, res) => {
    try {
      const {
        lat,
        lng,
        radius = 5000,
      } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message:
            "Latitude and longitude are required",
        });
      }

      const location = `${lat},${lng}`;

      const places =
        await freeMapService.nearbySearch(
          location,
          Number(radius)
        );

      res.json({
        success: true,
        places,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          "Failed to get nearby places",
      });
    }
  };

// Directions
const getDirections =
  async (req, res) => {
    try {
      const {
        origin,
        destination,
      } = req.query;

      if (
        !origin ||
        !destination
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Origin and destination are required",
        });
      }

      const directions =
        await freeMapService.getDirections(
          origin,
          destination
        );

      res.json({
        success: true,
        directions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          "Failed to get directions",
      });
    }
  };

// Geocode Address
const geocodeAddress =
  async (req, res) => {
    try {
      const { address } =
        req.query;

      if (!address) {
        return res.status(400).json({
          success: false,
          message:
            "Address is required",
        });
      }

      const result =
        await freeMapService.geocode(
          address
        );

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          "Failed to geocode address",
      });
    }
  };

// Reverse Geocode
const reverseGeocode =
  async (req, res) => {
    try {
      const { lat, lng } =
        req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message:
            "Latitude and longitude are required",
        });
      }

      const result =
        await freeMapService.reverseGeocode(
          Number(lat),
          Number(lng)
        );

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          "Failed to reverse geocode",
      });
    }
  };

module.exports = {
  searchPlaces,
  getNearbyPlaces,
  getDirections,
  geocodeAddress,
  reverseGeocode,
};