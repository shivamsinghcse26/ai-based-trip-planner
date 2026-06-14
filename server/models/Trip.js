const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    destination: {
      city: {
        type: String,
        required: true,
      },

      country: {
        type: String,
        required: true,
      },

      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    preferences: {
      budget: {
        min: Number,

        max: Number,

        currency: {
          type: String,
          default: "INR",
        },
      },

      duration: {
        type: Number,
        required: true,
      },

      travelStyle: {
        type: String,
        enum: ["budget", "luxury", "adventure", "relaxation"],
        default: "budget",
      },

      groupSize: {
        type: Number,
        default: 1,
      },

      interests: [String],
    },

    itinerary: {
      days: [
        {
          day: Number,

          title: String,

          activities: [
            {
              time: String,

              activity: String,

              location: {
                name: String,

                address: String,

                coordinates: {
                  lat: Number,
                  lng: Number,
                },
              },

              cost: {
                amount: Number,

                currency: {
                  type: String,
                  default: "INR",
                },
              },
            },
          ],
        },
      ],

      totalCost: {
        amount: Number,

        currency: {
          type: String,
          default: "INR",
        },
      },

      summary: String,
    },

    status: {
      type: String,
      enum: ["draft", "upcoming", "completed"],
      default: "draft",
    },

    startDate: Date,

    endDate: Date,

    notes: String,

    isPublic: {
      type: Boolean,
      default: false,
    },

    tags: [String],
  },
  {
    timestamps: true,
  },
);

// Indexes
tripSchema.index({ user: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Trip", tripSchema);
