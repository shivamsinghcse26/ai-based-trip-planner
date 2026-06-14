const { validationResult } = require("express-validator");

const User = require("../models/User");

const tokenManager = require("../utils/tokens");

// Register
const register = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { name, email, password } = req.body;

    // Check Existing User
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Create User
    const user = await new User({
      name,
      email,
      password,
    });

    // Generate Tokens
    const tokens = tokenManager.generateTokenPair(user);

    user.refreshToken = tokenManager.hashToken(tokens.refreshToken);
    await user.save();

    // Save Refresh Token Cookie
    res.cookie(
      "refreshToken",
      tokens.refreshToken,
      tokenManager.getRefreshTokenCookieOptions(),
    );
    res.cookie(
      "accessToken",
      tokens.accessToken,
      tokenManager.getAccessTokenCookieOptions(),
    );
    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
    };

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find User
    const user = await User.findOne({
      email,
    }).select("+password");

    // Check User
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate Tokens
    const tokens = tokenManager.generateTokenPair(user);

    user.refreshToken = tokenManager.hashToken(tokens.refreshToken);
    await user.save();

    // Save Refresh Token Cookie
    res.cookie(
      "refreshToken",
      tokens.refreshToken,
      tokenManager.getRefreshTokenCookieOptions(),
    );
    res.cookie(
      "accessToken",
      tokens.accessToken,
      tokenManager.getAccessTokenCookieOptions(),
    );
    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
    };

    res.json({
      success: true,
      message: "Login successful",
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// Get New Access Token and  Refresh Token using Refresh Token
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found",
      });
    }

    const decoded = tokenManager.verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const hashedToken = tokenManager.hashToken(refreshToken);

    if (user.refreshToken !== hashedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Generate Tokens
    const tokens = tokenManager.generateTokenPair(user);

    user.refreshToken = tokenManager.hashToken(tokens.refreshToken);
    await user.save();

    res.cookie(
      "refreshToken",
      tokens.refreshToken,
      tokenManager.getRefreshTokenCookieOptions(),
    );

    res.cookie(
      "accessToken",
      tokens.accessToken,
      tokenManager.getAccessTokenCookieOptions(),
    );

    res.json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

// Logout

const logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  try {
    if (refreshToken) {
      const decoded = tokenManager.verifyRefreshToken(refreshToken);

      const user = await User.findById(decoded.id);
      user.refreshToken = null;
      await user.save();
    }
  } catch (error) {
    // Ignore Errors During Logout
  }

  res.clearCookie("refreshToken");
  res.clearCookie("accessToken");

  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select("+password");

    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;

    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Password change failed",
    });
  }
};

// Current User
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { name,  preferences } = req.body;

    if (name) user.name = name;

    if (preferences) {
      user.preferences = preferences;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  changePassword,
  getMe,
  updateProfile,
};
