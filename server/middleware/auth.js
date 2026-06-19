const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcrypt');

/**
 * Authentication middleware.
 * In production it expects a valid JWT Bearer token.
 * In development (NODE_ENV !== 'production') it will automatically create or fetch a
 * dev user (email: dev@example.com) when no Authorization header is provided.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // Development shortcut – no token required
  if (process.env.NODE_ENV !== 'production' && (!authHeader || !authHeader.startsWith('Bearer '))) {
    // Find or create a deterministic dev user
    let devUser = await User.findOne({ email: 'dev@example.com' });
    if (!devUser) {
      const hash = await bcrypt.hash('devpassword', 10);
      devUser = await User.create({
        name: 'Dev User',
        username: 'devuser',
        email: 'dev@example.com',
        passwordHash: hash,
      });
    }
    req.user = { userId: devUser._id.toString(), email: devUser.email };
    return next();
  }

  // Production path – token required
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }

  const token = authHeader.slice('Bearer '.length);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'Server misconfiguration: missing JWT_SECRET' });
  }

  try {
    const payload = jwt.verify(token, secret);
    // payload: { userId, email }
    req.user = { userId: payload.userId, email: payload.email };
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = { requireAuth };

