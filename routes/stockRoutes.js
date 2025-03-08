const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock'); // Stock model
const { getLatestStockPrice } = require('../utils/stockData'); // Function to fetch stock prices
const { isAuthenticated } = require('../middlewares/authMiddleware'); // Auth middleware

/**
 * POST /stocks/add
 * Add a stock for the logged-in user.
 */
router.post('/add', isAuthenticated, async (req, res) => {
  try {
    const { symbol, buyPrice, quantity } = req.body;
    if (!symbol || !buyPrice || !quantity) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Create and save stock entry
    const newStock = new Stock({
      userEmail: req.user.email,
      symbol,
      buyPrice,
      quantity
    });

    await newStock.save();
    res.status(201).json({ message: 'Stock added successfully', stock: newStock });
  } catch (error) {
    console.error('❌ Error adding stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/user', isAuthenticated, async (req, res) => {
    try {
      const userEmail = req.user.email; // Get logged-in user's email
      const userStocks = await Stock.find({ userEmail });
  
      res.json({ stocks: userStocks });
    } catch (error) {
      console.error('Error fetching user stocks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  router.get('/profitloss/:email', async (req, res) => {
    try {
      const userEmail = req.params.email;
  
      // Fetch all stocks for the user from DB
      const userStocks = await Stock.find({ email: userEmail });
  
      if (!userStocks.length) {
        return res.status(404).json({ message: 'No stocks found for this user' });
      }
  
      // Process each stock asynchronously
      const results = await Promise.all(userStocks.map(async (stock) => {
        try {
          const { price: currentPrice, date: latestDate } = await getLatestStockPrice(stock.symbol);
  
          const profit = (currentPrice - stock.buyPrice) * stock.quantity;
          const currentValue = currentPrice * stock.quantity;
  
          return {
            symbol: stock.symbol,
            quantity: stock.quantity,
            buyPrice: stock.buyPrice,
            currentDayPrice: currentPrice,
            priceDate: latestDate,
            profit: profit,
            currentValue: currentValue
          };
        } catch (error) {
          console.error(`Error fetching price for ${stock.symbol}:`, error.message);
          return { symbol: stock.symbol, error: 'Could not fetch stock price' };
        }
      }));
  
      res.json({ user: userEmail, stocks: results });
    } catch (error) {
      console.error('Error calculating profit/loss:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
module.exports = router;
