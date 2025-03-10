// routes/stockRoutes.js
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
  console.log('[DEBUG] POST /stocks/add triggered');
  console.log('[DEBUG] Request body:', req.body);

  try {
    const { symbol, buyPrice, quantity } = req.body;
    if (!symbol || !buyPrice || !quantity) {
      console.log('[DEBUG] Missing required fields');
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Use the logged-in user's email from the session
    const userEmail = req.user.email;
    console.log('[DEBUG] userEmail from session:', userEmail);

    // Create and save the new stock entry
    const newStock = new Stock({
      userEmail,
      symbol,
      buyPrice,
      quantity
    });

    await newStock.save();
    console.log('[DEBUG] Successfully saved new stock:', newStock);
    res.status(201).json({ message: 'Stock added successfully', stock: newStock });
  } catch (error) {
    console.error('[DEBUG] Error adding stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /stocks/user
 * Get all stocks for the logged-in user.
 */
router.get('/user', isAuthenticated, async (req, res) => {
  try {
    const userEmail = req.user.email;
    console.log('[DEBUG] GET /stocks/user for user:', userEmail);
    const userStocks = await Stock.find({ userEmail });
    console.log('[DEBUG] Stocks found:', userStocks);
    res.json({ stocks: userStocks });
  } catch (error) {
    console.error('[DEBUG] Error fetching user stocks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /stocks/profitloss/:email
 * For a given user email, fetch each stock's current price and calculate profit/loss.
 * This route is protected and verifies that the logged-in user's email matches the parameter.
 */
router.get('/profitloss/:email', isAuthenticated, async (req, res) => {
  try {
    const userEmailParam = req.params.email;
    console.log('[DEBUG] GET /stocks/profitloss for user:', userEmailParam);

    // Ensure the logged-in user's email matches the parameter to prevent unauthorized access.
    if (req.user.email !== userEmailParam) {
      console.log('[DEBUG] Unauthorized access attempt');
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Query using the correct field "userEmail"
    const userStocks = await Stock.find({ userEmail: userEmailParam });
    console.log('[DEBUG] Stocks fetched:', userStocks);

    if (!userStocks.length) {
      console.log('[DEBUG] No stocks found for this user');
      return res.status(404).json({ message: 'No stocks found for this user' });
    }

    // Process each stock asynchronously to fetch latest price and calculate profit/loss
    const results = await Promise.all(userStocks.map(async (stock) => {
      try {
        const { price: currentPrice, date: latestDate } = await getLatestStockPrice(stock.symbol);
        const profit = (currentPrice - stock.buyPrice) * stock.quantity;
        const currentValue = currentPrice * stock.quantity;
        console.log(`[DEBUG] ${stock.symbol} - currentPrice: ${currentPrice}, profit: ${profit}`);
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
        console.error(`[DEBUG] Error fetching price for ${stock.symbol}:`, error.message);
        return { symbol: stock.symbol, error: 'Could not fetch stock price' };
      }
    }));

    res.json({ user: userEmailParam, stocks: results });
  } catch (error) {
    console.error('[DEBUG] Error calculating profit/loss:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /stocks/delete/:symbol
 * Delete a stock entry for the logged-in user by symbol.
 */
router.delete('/delete/:symbol', isAuthenticated, async (req, res) => {
  try {
    const symbol = req.params.symbol;
    console.log('[DEBUG] DELETE /stocks/delete for symbol:', symbol);

    // Only delete stock where userEmail matches the logged-in user.
    const result = await Stock.deleteOne({ userEmail: req.user.email, symbol });
    if (result.deletedCount === 0) {
      console.log('[DEBUG] No stock found to delete for symbol:', symbol);
      return res.status(404).json({ message: 'Stock not found' });
    }
    console.log('[DEBUG] Stock deleted successfully for symbol:', symbol);
    res.json({ message: `Stock ${symbol} deleted successfully` });
  } catch (error) {
    console.error('[DEBUG] Error deleting stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
