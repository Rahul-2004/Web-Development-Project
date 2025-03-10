const express = require('express');
const passport = require('passport');
const router = express.Router();

// 1️⃣ Trigger Google login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2️⃣ Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    console.log('🔹 Google callback success, user:', req.user);
    res.redirect(`http://localhost:5500/dashboard.html`); // Redirect to frontend
  }
);

// 3️⃣ Check if user is logged in
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: 'Not logged in' });
  }
});

// 4️⃣ Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(' Error in logout:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.redirect('http://localhost:5500/index.html'); // Redirect after logout
    });
  });
});

module.exports = router;
