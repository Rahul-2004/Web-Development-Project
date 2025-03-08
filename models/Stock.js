const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  symbol: { type: String, required: true },
  buyPrice: { type: Number, required: true },
  quantity: { type: Number, required: true }
});

module.exports = mongoose.model('Stock', StockSchema);
