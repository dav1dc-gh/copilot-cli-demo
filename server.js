require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { insertFeedback, getAllFeedback, getFeedbackCount, close: closeDb } = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet());

// Redirect HTTP to HTTPS in production (when behind a TLS-terminating proxy)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
  app.set('trust proxy', 1);
}

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static('public'));

// Rate limiter for feedback submissions
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 submissions per window per IP
  message: { success: false, message: 'Too many submissions. Please try again later.' }
});

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 auth attempts per window per IP
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' }
});

// Basic auth middleware for protected endpoints
function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Feedback Admin"');
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
  const separatorIndex = credentials.indexOf(':');
  if (separatorIndex === -1) {
    res.set('WWW-Authenticate', 'Basic realm="Feedback Admin"');
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  const user = credentials.slice(0, separatorIndex);
  const pass = credentials.slice(separatorIndex + 1);

  const expectedUser = process.env.AUTH_USER;
  const expectedPass = process.env.AUTH_PASS;

  if (!expectedUser || !expectedPass) {
    return res.status(503).json({ success: false, message: 'Auth not configured on server' });
  }

  // Timing-safe comparison to prevent timing attacks
  const userMatch = user.length === expectedUser.length &&
    crypto.timingSafeEqual(Buffer.from(user), Buffer.from(expectedUser));
  const passMatch = pass.length === expectedPass.length &&
    crypto.timingSafeEqual(Buffer.from(pass), Buffer.from(expectedPass));

  if (userMatch && passMatch) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Feedback Admin"');
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
}

// Sanitize string input: trim and escape HTML entities
function sanitize(str) {
  return str.trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Serve the feedback form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle feedback submission
app.post('/submit-feedback', submitLimiter, (req, res) => {
  const { name, email, rating, comments, recommend } = req.body;
  
  // Validate input
  if (!name || !email || !rating || !comments || !recommend) {
    return res.status(400).json({ 
      success: false, 
      message: 'All fields are required' 
    });
  }

  // Validate types are strings
  if (typeof name !== 'string' || typeof email !== 'string' || typeof comments !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid input types' 
    });
  }

  // Enforce length limits
  if (name.length > 100) {
    return res.status(400).json({ success: false, message: 'Name must be 100 characters or less' });
  }
  if (email.length > 254) {
    return res.status(400).json({ success: false, message: 'Email must be 254 characters or less' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }
  if (comments.length > 2000) {
    return res.status(400).json({ success: false, message: 'Comments must be 2000 characters or less' });
  }

  if (recommend !== 'yes' && recommend !== 'no') {
    return res.status(400).json({ 
      success: false, 
      message: 'Recommend must be yes or no' 
    });
  }

  const ratingNum = parseInt(rating, 10);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ 
      success: false, 
      message: 'Rating must be between 1 and 5' 
    });
  }

  // Store feedback with sanitized values
  const feedback = insertFeedback({
    name: sanitize(name),
    email: sanitize(email),
    rating: ratingNum,
    comments: sanitize(comments),
    recommend,
    timestamp: new Date().toISOString()
  });
  
  console.log('New feedback received: id=%d, rating=%d, timestamp=%s', feedback.id, feedback.rating, feedback.timestamp);
  
  res.json({ 
    success: true, 
    message: 'Thank you for your feedback!',
    feedback 
  });
});

// Get all feedback (protected endpoint with pagination)
app.get('/feedback', authLimiter, basicAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const feedbackList = getAllFeedback({ limit, offset });
  const total = getFeedbackCount();
  res.json({ 
    success: true, 
    total,
    limit,
    offset,
    count: feedbackList.length,
    feedback: feedbackList 
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Feedback form server running on http://localhost:${PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log('Shutting down gracefully...');
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  // Force exit after 5s if connections don't close
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
