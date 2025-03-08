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
