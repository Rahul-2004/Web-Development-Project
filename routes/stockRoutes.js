// routes/stockRoutes.js
const express = require('express');
const router = express.Router();

// POST /stocks/add
router.post('/add', (req, res) => {
  console.log('🔹 Adding stock:', req.body);
  // Example only; you'd normally save to DB
  res.json({ message: 'Stock added', stock: req.body });
});

// GET /stocks
router.get('/', (req, res) => {
  console.log('🔹 Getting stocks');
  // Example only
  res.json({ stocks: [] });
});

module.exports = router;
