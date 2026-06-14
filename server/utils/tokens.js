const jwt = require("jsonwebtoken");
const crypto = require("crypto");

class TokenManager {
  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;

    this.accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY || "15m";

    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || "7d";

    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error("JWT secrets not configured");
    }
  }

  // Generate Access Token
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user._id || user.id,
      },
      this.accessTokenSecret,
      {
        expiresIn: this.accessTokenExpiry,
      },
    );
  }

  // Generate Refresh Token
  generateRefreshToken(user) {
    return jwt.sign(
      {
        id: user._id || user.id,
      },
      this.refreshTokenSecret,
      {
        expiresIn: this.refreshTokenExpiry,
      },
    );
  }

  // Verify Access Token
  verifyAccessToken(token) {
    return jwt.verify(token, this.accessTokenSecret);
  }

  // Verify Refresh Token
  verifyRefreshToken(token) {
    return jwt.verify(token, this.refreshTokenSecret);
  }

  // Generate Both Tokens
  generateTokenPair(user) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  // Hash Token
  hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  // Extract Bearer Token
  

  // Refresh Token Cookie Options
  getRefreshTokenCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  // Access Token Cookie Options
  getAccessTokenCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 15 * 60 * 1000,
    };
  }
}
module.exports = new TokenManager();
