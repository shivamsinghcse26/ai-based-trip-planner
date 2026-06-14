const express = require("express");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Get Profile
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// Update Profile
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, preferences } = req.body;

    const updatedData = {};

    if (name) updatedData.name = name;

    if (preferences) {
      updatedData.preferences = preferences;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updatedData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// Get Saved Destinations
router.get("/saved-destinations", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      savedDestinations: user.savedDestinations,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// Add Saved Destination
router.post("/saved-destinations", protect, async (req, res) => {
  try {
    const { name, lat, lng } = req.body;

    if (!name || !lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Name, latitude and longitude are required",
      });
    }

    const user = await User.findById(req.user.id);

    user.savedDestinations.push({
      name,
      coordinates: {
        lat: Number(lat),
        lng: Number(lng),
      },
    });

    await user.save();

    res.json({
      success: true,
      message: "Destination saved successfully",
      savedDestinations: user.savedDestinations,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

// Delete Saved Destination
router.delete("/saved-destinations/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    user.savedDestinations = user.savedDestinations.filter(
      (destination) => destination._id.toString() !== req.params.id,
    );

    await user.save();

    res.json({
      success: true,
      message: "Destination removed successfully",
      savedDestinations: user.savedDestinations,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

module.exports = router;
