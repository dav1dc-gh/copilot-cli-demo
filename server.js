const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Store feedback in memory (in production, use a database)
const feedbackList = [];
let feedbackIdCounter = 0;

// Serve the feedback form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle feedback submission
app.post('/submit-feedback', (req, res) => {
  const { name, email, rating, comments, recommend } = req.body;
  
  // Validate input
  if (!name || !rating || !comments) {
    return res.status(400).json({ 
      success: false, 
      message: 'Name, rating, and comments are required' 
    });
  }

  const ratingNum = parseInt(rating, 10);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ 
      success: false, 
      message: 'Rating must be between 1 and 5' 
    });
  }

  // Store feedback
  const feedback = {
    id: ++feedbackIdCounter,
    name,
    email,
    rating: ratingNum,
    comments,
    recommend: recommend || null,
    timestamp: new Date().toISOString()
  };
  
  feedbackList.push(feedback);
  
  console.log('New feedback received:', feedback);
  
  res.json({ 
    success: true, 
    message: 'Thank you for your feedback!',
    feedback 
  });
});

// Get all feedback (optional endpoint to view submissions)
app.get('/feedback', (req, res) => {
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
