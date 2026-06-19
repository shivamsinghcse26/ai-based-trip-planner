const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

async function generateUsername(name, email) {
  const base = String(name || email.split('@')[0] || 'user')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20) || 'user'

  let candidate = base
  let attempt = 0
  while (await User.findOne({ username: candidate })) {
    attempt += 1
    candidate = `${base}${Math.floor(Math.random() * 9000) + 1000}`
    if (attempt > 10) {
      candidate = `${base}${Date.now()}`
      break
    }
  }

  return candidate
}

const router = express.Router();

function signToken({ user }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET');
  }
  return jwt.sign({ userId: user._id.toString(), email: user.email }, secret, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, password are required' });
    }
    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const username = await generateUsername(name, email);
    const user = await User.create({ name, username, email: String(email).toLowerCase(), passwordHash });
    const token = signToken({ user });
    return res.status(201).json({ token, user: { id: user._id.toString(), name: user.name, email: user.email } });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = signToken({ user });
    return res.json({ token, user: { id: user._id.toString(), name: user.name, email: user.email } });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  return res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.userId).select('name email');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  return res.json({ id: user._id.toString(), name: user.name, email: user.email });
});

module.exports = router;