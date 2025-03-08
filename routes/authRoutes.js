// routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const router = express.Router();

// 1) Trigger Google login with scope
router.get('/google', (req, res, next) => {
  console.log('🔹 GET /auth/google triggered');
  next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2) Google callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    console.log('🔹 Google callback success, user:', req.user);
    // You can redirect to a frontend route or send JSON
    res.json({ message: 'Google OAuth success', user: req.user });
  }
);

// For convenience, a separate "signup" route (if you want):
router.get('/signup', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('❌ Error in logout:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    console.log('🔹 User logged out');
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
