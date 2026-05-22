require('dotenv').config();
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { insertFeedback, getAllFeedback } = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet());

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

// Basic auth middleware for protected endpoints
function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Feedback Admin"');
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
  const [user, pass] = credentials.split(':');

  const expectedUser = process.env.AUTH_USER;
  const expectedPass = process.env.AUTH_PASS;

  if (!expectedUser || !expectedPass) {
    return res.status(503).json({ success: false, message: 'Auth not configured on server' });
  }

  if (user === expectedUser && pass === expectedPass) {
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
  
  console.log('New feedback received:', feedback);
  
  res.json({ 
    success: true, 
    message: 'Thank you for your feedback!',
    feedback 
  });
});

// Get all feedback (protected endpoint)
app.get('/feedback', basicAuth, (req, res) => {
  const feedbackList = getAllFeedback();
  res.json({ 
    success: true, 
    count: feedbackList.length,
    feedback: feedbackList 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Feedback form server running on http://localhost:${PORT}`);
});
