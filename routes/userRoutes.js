// routes/userRoutes.js
const express = require('express');
const router = express.Router();

// GET /users/profile
router.get('/profile', (req, res) => {
  if (req.isAuthenticated()) {
    console.log('🔹 Authenticated user:', req.user);
    return res.json({ user: req.user });
  }
  console.log('❌ User not authenticated');
  res.status(401).json({ error: 'Not authenticated' });
});

module.exports = router;
