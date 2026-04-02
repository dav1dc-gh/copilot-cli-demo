const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { insertFeedback, getAllFeedback } = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Rate limiter for feedback submissions
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions. Please try again later.' }
});

// Serve the feedback form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle feedback submission
app.post('/submit-feedback', submitLimiter, (req, res) => {
  const { name, email, rating, hearAboutUs, comments } = req.body;
  
  // Validate required fields
  if (!name || !email || !rating || !hearAboutUs || !comments) {
    return res.status(400).json({ 
      success: false, 
      message: 'All fields are required' 
    });
  }

  // Input length validation
  if (name.length > 100) {
    return res.status(400).json({ success: false, message: 'Name must be 100 characters or less' });
  }
  if (email.length > 254) {
    return res.status(400).json({ success: false, message: 'Email must be 254 characters or less' });
  }
  if (comments.length > 2000) {
    return res.status(400).json({ success: false, message: 'Comments must be 2000 characters or less' });
  }

  const validSources = ['search_engine', 'social_media', 'friend_family', 'advertisement', 'blog_article', 'other'];
  if (!validSources.includes(hearAboutUs)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid selection for "How did you hear about us?"' 
    });
  }

  const ratingNum = parseInt(rating, 10);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ 
      success: false, 
      message: 'Rating must be between 1 and 5' 
    });
  }

  // Store feedback in SQLite
  const feedback = insertFeedback({
    name,
    email,
    rating: ratingNum,
    hearAboutUs,
    comments
  });
  
  console.log('New feedback received:', feedback);
  
  res.json({ 
    success: true, 
    message: 'Thank you for your feedback!',
    feedback 
  });
});

// Get all feedback
app.get('/feedback', (req, res) => {
  const feedback = getAllFeedback();
  res.json({ 
    success: true, 
    count: feedback.length,
    feedback 
  });
});

// Start server (only when run directly)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Feedback form server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
