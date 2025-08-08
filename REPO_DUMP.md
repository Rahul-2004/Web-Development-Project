# Repository Dump: Stock Investment Tracker

This single file provides a complete, self-contained overview and source listing so any AI model (or engineer) can quickly understand the project.

## Overview
- Runtime: Node.js (Express) backend with Google OAuth 2.0 (Passport), sessions, MongoDB (Mongoose)
- Purpose: Track user stock holdings, compute profit/loss using latest prices from Alpha Vantage API
- Frontend: Static HTML/JS pages calling REST endpoints (fetch, CORS enabled)
- Data: `User` and `Stock` collections
- Security/Auth: Session-based via Passport Google strategy, protected routes via `isAuthenticated` middleware
- Note: A small set of Python/Flask artifacts (`requirements.txt`, `templates/`, `secret.py`) indicates an earlier/prototype Python version. The active backend is Node/Express.

## Project Structure
```
/workspace
  ├─ server.js
  ├─ package.json
  ├─ package-lock.json
  ├─ requirements.txt               # Python prototype deps (unused by Node backend)
  ├─ config/
  │   ├─ db.js
  │   └─ passport.js
  ├─ middlewares/
  │   └─ authMiddleware.js
  ├─ models/
  │   ├─ Stock.js
  │   └─ User.js
  ├─ routes/
  │   ├─ authRoutes.js
  │   ├─ stockRoutes.js
  │   └─ userRoutes.js
  ├─ utils/
  │   └─ stockData.js
  ├─ index.html                     # Simple landing + Google login
  ├─ dashboard.html                 # Frontend dashboard (static)
  ├─ templates/                     # Jinja templates (from Flask prototype)
  │   ├─ add_stock.html
  │   ├─ dashboard.html
  │   ├─ index.html
  │   ├─ landing.html
  │   └─ new_user.html
  └─ secret.py                      # Utility to generate a random key (Python)
```

## Environment Variables
- `PORT`: Express server port (default 5000)
- `MONGO_URI`: MongoDB connection string
- `SESSION_SECRET`: Session secret for `express-session`
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `ALPHA_VANTAGE_API_KEY`: API key for stock price retrieval

## How to Run (Node backend)
1) Set env vars in a `.env` file at project root:
```
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
SESSION_SECRET=<random-hex>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
ALPHA_VANTAGE_API_KEY=<alpha-vantage-key>
PORT=5000
```
2) Install and start:
```
npm install
npm start
```
3) Open frontend:
- Open `index.html` via a simple static server (or VS Code Live Server) on `http://localhost:5500` (CORS origin configured in `server.js`).
- Click "Login with Google".

## API Surface (major)
- `GET /` – Health check
- Auth (`/auth`):
  - `GET /auth/google` – Start Google OAuth
  - `GET /auth/google/callback` – OAuth callback; redirects to dashboard
  - `GET /auth/user` – Current session user
  - `GET /auth/logout` – Logout
- Users (`/users`):
  - `GET /users/profile` – Returns authenticated profile
- Stocks (`/stocks`) [all require auth]:
  - `POST /stocks/add` – Add a user stock: `{ symbol, buyPrice, quantity }`
  - `GET /stocks/user` – List current user stocks
  - `GET /stocks/profitloss/:email` – Profit/loss for the user’s stocks (email must match session)
  - `DELETE /stocks/delete/:symbol` – Remove a stock by symbol for current user

## Data Models (Mongoose)
- `User`: `{ googleId, name, email }`
- `Stock`: `{ userEmail, symbol, buyPrice, quantity }`

## Notable Implementation Details
- Session-based auth + Passport serialize/deserialize to persist user sessions.
- CORS configured for frontend origin `http://localhost:5500`, with credentials enabled.
- Alpha Vantage integration in `utils/stockData.js` for daily time series and latest close.
- Profit/loss computed per-stock using latest close and stored buy price/quantity.
- Defensive checks for route access (enforce email matching on profit/loss route).

---

## Full Source Listing

### package.json
```json
{
  "name": "web-development-project",
  "version": "1.0.0",
  "description": "Node.js backend with Google OAuth, sessions, and MongoDB.",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "axios": "^1.8.2",
    "bcryptjs": "^3.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.12.1",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0"
  }
}
```

### package-lock.json
```json
// truncated or omitted in this preview
```

### requirements.txt
```text
flask==2.3.3
flask-pymongo==2.3.0
authlib==1.2.1
yfinance==0.2.28
python-dotenv==1.0.0
requests==2.31.0
```

### server.js
```javascript
require('dotenv').config();
const cors = require('cors');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const passport = require('passport'); // from node_modules
require('./config/passport');        // loads our passport config

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const stockRoutes = require('./routes/stockRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Debug middleware: logs every request
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(cors({
  origin: 'http://localhost:5500', // The frontend URL
  credentials: true               // Allow session cookies from browser
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware (required for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true } // set secure: true if HTTPS in production
}));

// Initialize Passport (must come after session)
app.use(passport.initialize());
app.use(passport.session());

// Mongoose debug (shows Mongo queries in console)
mongoose.set('debug', true);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Mount routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/stocks', stockRoutes);

// Test route
app.get('/', (req, res) => {
  console.log('GET / triggered');
  res.json({ message: 'Server is running!' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### config/db.js
```javascript
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

module.exports = connectDB;
```

### config/passport.js
```javascript
// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); // import our Mongoose model

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  // Must match one of your "Authorized redirect URIs" in Google Cloud Console
  callbackURL: '/auth/google/callback'
}, 
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🔹 Google profile:', profile);

      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        // Create a new user
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value
        });
        console.log('🔹 New user created:', user);
      } else {
        console.log('🔹 Existing user found:', user);
      }
      return done(null, user);
    } catch (err) {
      console.error('Error in GoogleStrategy:', err);
      return done(err, null);
    }
  }
));

// Passport session setup
passport.serializeUser((user, done) => {
  console.log('🔹 serializeUser:', user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    console.log('deserializeUser:', user);
    done(null, user);
  } catch (err) {
    console.error('Error in deserializeUser:', err);
    done(err, null);
  }
});
```

### middlewares/authMiddleware.js
```javascript
module.exports.isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Please log in first' });
  };
```

### models/User.js
```javascript
// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true }
});

module.exports = mongoose.model('User', UserSchema);
```

### models/Stock.js
```javascript
const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  symbol: { type: String, required: true },
  buyPrice: { type: Number, required: true },
  quantity: { type: Number, required: true }
});

module.exports = mongoose.model('Stock', StockSchema);
```

### routes/authRoutes.js
```javascript
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
```

### routes/userRoutes.js
```javascript
// routes/userRoutes.js
const express = require('express');
const router = express.Router();

// GET /users/profile
router.get('/profile', (req, res) => {
  if (req.isAuthenticated()) {
    console.log('🔹 Authenticated user:', req.user);
    return res.json({ user: req.user });
  }
  console.log('User not authenticated');
  res.status(401).json({ error: 'Not authenticated' });
});

module.exports = router;
```

### routes/stockRoutes.js
```javascript
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
```

### utils/stockData.js
```javascript
// utils/stockData.js
const axios = require('axios');

/**
 * Get the daily time series data for a given symbol.
 * Note: For Indian stocks, you might need to use a symbol like "RELIANCE.NSE".
 */
async function getDailyTimeSeries(symbol) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
  try {
    const response = await axios.get(url);
    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) {
      throw new Error('No time series data returned');
    }
    return timeSeries;
  } catch (error) {
    console.error('Error fetching daily time series:', error.message);
    throw error;
  }
}

/**
 * Get the closing price for a given symbol on a specific date.
 * Date should be in YYYY-MM-DD format.
 */
async function getStockPriceOnDate(symbol, date) {
  const timeSeries = await getDailyTimeSeries(symbol);
  if (timeSeries[date]) {
    return parseFloat(timeSeries[date]['4. close']);
  } else {
    throw new Error(`No data for date ${date}`);
  }
}

/**
 * Get the latest available closing price for a given symbol.
 */
async function getLatestStockPrice(symbol) {
  const timeSeries = await getDailyTimeSeries(symbol);
  const dates = Object.keys(timeSeries).sort((a, b) => (a < b ? 1 : -1)); // descending order
  const latestDate = dates[0];
  return { price: parseFloat(timeSeries[latestDate]['4. close']), date: latestDate };
}

module.exports = { getStockPriceOnDate, getLatestStockPrice };
```

### index.html (root)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stock Tracker</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; }
        button { padding: 10px 20px; margin: 10px; cursor: pointer; }
        input { padding: 8px; margin: 5px; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <h1>Stock Investment Tracker</h1>

    <!-- Login -->
    <div id="login-section">
        <button onclick="loginWithGoogle()">Login with Google</button>
    </div>

    <!-- User Details -->
    <div id="user-section" class="hidden">
        <h3>Welcome, <span id="user-name"></span></h3>
        <button onclick="logout()">Logout</button>

        <h2>Add Stock</h2>
        <input type="text" id="stock-symbol" placeholder="Stock Symbol (e.g., RELIANCE.NSE)">
        <input type="number" id="stock-qty" placeholder="Quantity">
        <input type="number" id="stock-price" placeholder="Buy Price">
        <button onclick="addStock()">Add Stock</button>

        <h2>Your Stocks</h2>
        <button onclick="fetchStocks()">Refresh Stocks</button>
        <div id="stocks-list"></div>
    </div>

    <script>
        let userEmail = "";

        // Step 1: Google Login
        function loginWithGoogle() {
            window.location.href = "http://localhost:5000/auth/google";
        }

        // Step 2: Check if Logged In
        async function checkLogin() {
            const res = await fetch("http://localhost:5000/auth/user", { credentials: "include" });
            const data = await res.json();

            if (data.user) {
                document.getElementById("login-section").classList.add("hidden");
                document.getElementById("user-section").classList.remove("hidden");
                document.getElementById("user-name").innerText = data.user.name;
                userEmail = data.user.email;
                fetchStocks();  // Fetch stocks automatically
            }
        }

        // Step 3: Add Stock Entry
        async function addStock() {
            const stockSymbol = document.getElementById("stock-symbol").value;
            const quantity = document.getElementById("stock-qty").value;
            const buyPrice = document.getElementById("stock-price").value;

            const res = await fetch("http://localhost:5000/stocks/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail, symbol: stockSymbol, buyPrice, quantity })
            });

            const data = await res.json();
            alert(data.message);
            console.log(data)
            fetchStocks();  // Refresh stocks after adding
        }

        // Step 4: Fetch Stocks and Calculate Profit/Loss
        async function fetchStocks() {
            const res = await fetch(`http://localhost:5000/stocks/profitloss/${userEmail}`);
            const data = await res.json();

            const stocksDiv = document.getElementById("stocks-list");
            stocksDiv.innerHTML = "<h3>Stock List</h3>";
            data.stocks.forEach(stock => {
                stocksDiv.innerHTML += `
                    <p><strong>${stock.symbol}</strong> | Qty: ${stock.quantity} | 
                    Buy Price: ${stock.buyPrice} | Current: ${stock.currentDayPrice} | 
                    Profit/Loss: ${stock.profit}</p>`;
            });
        }

        // Step 5: Logout
        async function logout() {
            await fetch("http://localhost:5000/auth/logout", { credentials: "include" });
            window.location.reload();
        }

        // Check if user is already logged in on page load
        checkLogin();
    </script>
</body>
</html>
```

### dashboard.html (root)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dashboard - Stock Tracker</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f2f2f2; }
    header { background: #333; color: white; padding: 10px; text-align: center; }
    main { padding: 20px; }
    form { margin-bottom: 20px; }
    input, button { padding: 8px; margin: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
    th { background: #eee; }
  </style>
</head>
<body>
  <header>
    <h1>Stock Tracker Dashboard</h1>
    <button id="logoutBtn">Logout</button>
  </header>

  <main>
    <section id="userInfo">
      <h2>Welcome, <span id="userName"></span></h2>
      <p>Your email: <span id="userEmail"></span></p>
    </section>

    <section id="addStock">
      <h2>Add Stock</h2>
      <form id="addStockForm">
        <input type="text" id="stockSymbol" placeholder="Stock Symbol (e.g., RELIANCE.NSE)" required />
        <input type="number" id="stockBuyPrice" placeholder="Buy Price" required />
        <input type="number" id="stockQuantity" placeholder="Quantity" required />
        <button type="submit">Add Stock</button>
      </form>
    </section>

    <section id="stocksTable">
      <h2>Your Stocks</h2>
      <button id="refreshStocks">Refresh Stocks</button>
      <table id="stocksList">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Quantity</th>
            <th>Buy Price</th>
            <th>Current Price</th>
            <th>Profit/Loss</th>
            <th>Current Value</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <!-- Stocks will be dynamically added here -->
        </tbody>
      </table>
    </section>
  </main>

  <script>
    let currentUserEmail = '';

    // Fetch logged-in user details and refresh stocks
    async function fetchUser() {
      console.log('[DEBUG] fetchUser called');
      try {
        const res = await fetch('http://localhost:5000/auth/user', { credentials: 'include' });
        const data = await res.json();
        console.log('[DEBUG] fetchUser data:', data);

        if (data.user) {
          document.getElementById('userName').innerText = data.user.name;
          document.getElementById('userEmail').innerText = data.user.email;
          currentUserEmail = data.user.email;
          console.log('[DEBUG] Current user email set to:', currentUserEmail);

          fetchStocks(); // Automatically refresh stocks after login
        } else {
          window.location.href = "index.html"; // Redirect if not logged in
        }
      } catch (error) {
        console.error('[DEBUG] Error fetching user:', error);
      }
    }

    // Add a new stock
    async function addStock(event) {
      event.preventDefault();
      console.log('[DEBUG] addStock called');

      const symbol = document.getElementById('stockSymbol').value;
      const buyPrice = parseFloat(document.getElementById('stockBuyPrice').value);
      const quantity = parseInt(document.getElementById('stockQuantity').value, 10);
      console.log('[DEBUG] addStock input:', { symbol, buyPrice, quantity });

      try {
        const res = await fetch('http://localhost:5000/stocks/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ symbol, buyPrice, quantity })
        });

        console.log('[DEBUG] addStock response:', res);
        const data = await res.json();
        console.log('[DEBUG] addStock data:', data);
        
        alert(data.message);
        fetchStocks(); // Refresh stocks after adding one
      } catch (error) {
        console.error('[DEBUG] Error in addStock:', error);
      }
    }

    // Fetch stocks with profit/loss info
    async function fetchStocks() {
      console.log('[DEBUG] fetchStocks called');
      if (!currentUserEmail) {
        console.error('[DEBUG] currentUserEmail is not set');
        return;
      }

      try {
        const res = await fetch(`http://localhost:5000/stocks/profitloss/${currentUserEmail}`, { credentials: 'include' });
        console.log('[DEBUG] fetchStocks response:', res);
        const data = await res.json();
        console.log('[DEBUG] fetchStocks data:', data);

        const tbody = document.querySelector('#stocksList tbody');
        tbody.innerHTML = '';

        if (data.stocks && data.stocks.length > 0) {
          data.stocks.forEach(stock => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${stock.symbol}</td>
              <td>${stock.quantity}</td>
              <td>${stock.buyPrice}</td>
              <td>${stock.currentDayPrice || 'N/A'}</td>
              <td>${stock.profit || 'N/A'}</td>
              <td>${stock.currentValue || 'N/A'}</td>
              <td><button onclick="deleteStock('${stock.symbol}')">Delete</button></td>
            `;
            tbody.appendChild(tr);
          });
        } else {
          tbody.innerHTML = `<tr><td colspan="7">No stocks found</td></tr>`;
        }
      } catch (error) {
        console.error('[DEBUG] Error fetching stocks:', error);
      }
    }

    // Delete a stock entry
    async function deleteStock(symbol) {
      if (!confirm(`Are you sure you want to delete stock ${symbol}?`)) return;
      console.log('[DEBUG] deleteStock called for symbol:', symbol);

      try {
        const res = await fetch(`http://localhost:5000/stocks/delete/${symbol}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        console.log('[DEBUG] deleteStock response:', res);
        const data = await res.json();
        console.log('[DEBUG] deleteStock data:', data);

        alert(data.message);
        fetchStocks(); // Refresh after deletion
      } catch (error) {
        console.error('[DEBUG] Error deleting stock:', error);
      }
    }

    // Logout function
    async function logout() {
      console.log('[DEBUG] logout called');

      try {
        const res = await fetch('http://localhost:5000/auth/logout', { credentials: 'include' });
        console.log('[DEBUG] logout response:', res);

        if (res.ok) {
          window.location.href = "index.html";
        }
      } catch (error) {
        console.error('[DEBUG] Error logging out:', error);
      }
    }

    // Event Listeners
    document.getElementById('addStockForm').addEventListener('submit', addStock);
    document.getElementById('refreshStocks').addEventListener('click', fetchStocks);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // On page load, fetch user and refresh stocks automatically
    fetchUser();
  </script>
</body>
</html>
```

### templates/ (Flask prototype)

add_stock.html
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Add Stock</title>
</head>
<body>
  <h1>Add a Stock</h1>
  
  {% with messages = get_flashed_messages() %}
    {% if messages %}
      <ul>
        {% for message in messages %}
          <li>{{ message }}</li>
        {% endfor %}
      </ul>
    {% endif %}
  {% endwith %}
  
  <!-- Form to add a stock from dashboard -->
  <form action="{{ url_for('add_stock_dashboard') }}" method="POST">
    <label for="symbol">Stock Symbol:</label>
    <input type="text" name="symbol" id="symbol" required>
    <br><br>
    <label for="buy_price">Buy Price per Share ($):</label>
    <input type="number" step="0.01" name="buy_price" id="buy_price" required>
    <br><br>
    <label for="quantity">Quantity:</label>
    <input type="number" name="quantity" id="quantity" required>
    <br><br>
    <button type="submit">Add Stock</button>
  </form>
  <br>
  <a href="{{ url_for('dashboard') }}"><button>Back to Dashboard</button></a>
</body>
</html>
```

dashboard.html
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dashboard</title>
</head>
<body>
  <h1>Dashboard</h1>
  <p>Welcome, {{ user.name }}!</p>
  <a href="{{ url_for('logout') }}">Logout</a>
  
  <hr>
  <h2>Your Stocks</h2>
  {% if stocks %}
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <th>Stock Symbol</th>
        <th>Buy Price</th>
        <th>Quantity</th>
        <th>Current Price</th>
        <th>Profit/Loss ($)</th>
        <th>Profit/Loss (%)</th>
      </tr>
      {% for stock in stocks %}
      <tr>
        <td>{{ stock.symbol }}</td>
        <td>{{ stock.buy_price }}</td>
        <td>{{ stock.quantity }}</td>
        <td>{{ stock.current_price }}</td>
        <td>{{ stock.profit_loss }}</td>
        <td>{{ stock.profit_loss_percentage }}</td>
      </tr>
      {% endfor %}
    </table>
  {% else %}
    <p>You have not added any stocks yet.</p>
  {% endif %}
  
  <br>
  <a href="{{ url_for('add_stock_dashboard') }}"><button>Add Stock</button></a>
</body>
</html>
```

index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Stock App</title>
</head>
<body>
  <h1>Welcome to My Stock App</h1>
  <p>Please log in with Google to continue.</p>
  
  <!-- Jinja link to the /login route -->
  <a href="{{ url_for('login') }}">Login with Google</a>
</body>
</html>
```

landing.html
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Welcome to My Stock App</title>
</head>
<body>
  <h1>Welcome to My Stock App</h1>
  <p>Please choose an option:</p>
  <a href="{{ url_for('signup') }}"><button>Signup</button></a>
  <a href="{{ url_for('login') }}"><button>Login</button></a>
  {% with messages = get_flashed_messages() %}
    {% if messages %}
      <ul>
        {% for message in messages %}
          <li>{{ message }}</li>
        {% endfor %}
      </ul>
    {% endif %}
  {% endwith %}
</body>
</html>
```

new_user.html
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Welcome, {{ user.name }}!</title>
</head>
<body>
  <h1>Welcome, {{ user.name }}!</h1>
  <p>Please add your stock details below, or skip to go to your dashboard.</p>
  
  {% with messages = get_flashed_messages() %}
    {% if messages %}
      <ul>
        {% for message in messages %}
          <li>{{ message }}</li>
        {% endfor %}
      </ul>
    {% endif %}
  {% endwith %}

  <!-- Form to add a stock -->
  <form action="{{ url_for('new_user') }}" method="POST">
    <label for="symbol">Stock Symbol:</label>
    <input type="text" name="symbol" id="symbol" required>
    <br><br>
    <label for="buy_price">Buy Price per Share ($):</label>
    <input type="number" step="0.01" name="buy_price" id="buy_price" required>
    <br><br>
    <label for="quantity">Quantity:</label>
    <input type="number" name="quantity" id="quantity" required>
    <br><br>
    <button type="submit">Add Stock</button>
  </form>
  <br>
  <!-- Option to skip and go to dashboard -->
  <a href="{{ url_for('dashboard') }}"><button>Skip and Go to Dashboard</button></a>
  
  <hr>
  <h2>Your Current Stocks</h2>
  {% if stocks %}
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <th>Stock Symbol</th>
        <th>Buy Price</th>
        <th>Quantity</th>
        <th>Current Price</th>
      </tr>
      {% for stock in stocks %}
      <tr>
        <td>{{ stock.symbol }}</td>
        <td>{{ stock.buy_price }}</td>
        <td>{{ stock.quantity }}</td>
        <td>{{ stock.current_price }}</td>
      </tr>
      {% endfor %}
    </table>
  {% else %}
    <p>No stocks added yet.</p>
  {% endif %}
  
  <br>
  <a href="{{ url_for('logout') }}">Logout</a>
</body>
</html>
```

### secret.py
```python
import secrets
random_key = secrets.token_hex(16)
print(random_key)  # This will display the generated key
```

---

End of repository dump.