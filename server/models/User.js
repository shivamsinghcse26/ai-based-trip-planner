const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    avatar: {
      type: String,
      default: "default-avatar.jpg",
    },

    

    refreshToken:{
      type: String,
      default: null,
    },

    preferences: {
      travelStyle: {
        type: String,
        enum: ["budget", "luxury", "adventure", "relaxation"],
        default: "budget",
      },

      budgetRange: {
        min: Number,
        max: Number,
      },

      currency: {
        type: String,
        default: "USD",
      },
    },

    savedDestinations: [
      {
        name: String,

        coordinates: {
          lat: Number,
          lng: Number,
        },

        country: String,
      },
    ],

    totalTripsCreated: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Hash Password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// Compare Password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
