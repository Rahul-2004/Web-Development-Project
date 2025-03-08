// models/Stock.js
const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  symbol: { type: String, required: true },
  buyPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Stock', StockSchema);
