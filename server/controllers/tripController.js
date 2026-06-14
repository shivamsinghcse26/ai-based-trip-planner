const { validationResult } = require("express-validator");

const Trip = require("../models/Trip");

// Create Trip
const createTrip = async (req, res) => {
  console.log("Create Trip Request Body:", req.body);
  console.log(req.body.status);
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const trip = await Trip.create({
      ...req.body,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Trip created successfully",
      trip,
    });
  } catch (error) {
  console.error("Create Trip Error:", error);
  console.error("Request Body:", req.body);

  res.status(500).json({
    success: false,
    message: "Error creating trip",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : undefined,
  });
}
};

// Get User Trips
const getTrips = async (req, res) => {
  try {
     console.log("Logged In User:", req.user);
    const trips = await Trip.find({
      user: req.user.id,
    }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      trips,
     
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching trips",
    });
  }
};

// Get Single Trip
const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Check Ownership
    if (trip.user.toString() !== req.user.id && !trip.isPublic) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    res.json({
      success: true,
      trip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching trip",
    });
  }
};

// Update Trip
const updateTrip = async (req, res) => {
  try {
    let trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Check Ownership
    if (trip.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    trip = await Trip.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "Trip updated successfully",
      trip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating trip",
    });
  }
};

// Delete Trip
const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Check Ownership
    if (trip.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    await Trip.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting trip",
    });
  }
};

// Clone Trip
const cloneTrip = async (req, res) => {
  try {
    const originalTrip = await Trip.findById(req.params.id);

    if (!originalTrip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const clonedTrip = await Trip.create({
      ...originalTrip.toObject(),
      _id: undefined,
      user: req.user.id,
      title: `${originalTrip.title} (Copy)`,
      status: "draft",
      isPublic: false,
    });

    res.status(201).json({
      success: true,
      message: "Trip cloned successfully",
      trip: clonedTrip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error cloning trip",
    });
  }
};

module.exports = {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  cloneTrip,
};
