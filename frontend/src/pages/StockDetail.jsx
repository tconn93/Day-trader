import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stocksAPI, watchlistAPI } from '../services/api';
import '../styles/StockDetail.css';

function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [timeRange, setTimeRange] = useState('1mo');

  useEffect(() => {
    fetchStockData();
    checkWatchlist();
  }, [symbol, timeRange]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      setError('');

      const [quoteRes, historyRes] = await Promise.all([
        stocksAPI.getQuote(symbol),
        stocksAPI.getHistoricalData(symbol, timeRange)
      ]);

      setQuote(quoteRes.data.quote);
      setHistoricalData(historyRes.data.data);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const checkWatchlist = async () => {
    try {
      const response = await watchlistAPI.checkStock(symbol);
      setIsInWatchlist(response.data.inWatchlist);
    } catch (err) {
      console.error('Error checking watchlist:', err);
    }
  };

  const handleAddToWatchlist = async () => {
    try {
      await watchlistAPI.addStock(symbol);
      setIsInWatchlist(true);
      setSuccess(`${symbol} added to watchlist`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add to watchlist');
    }
  };

  const handleRemoveFromWatchlist = async () => {
    try {
      await watchlistAPI.removeStock(symbol);
      setIsInWatchlist(false);
      setSuccess(`${symbol} removed from watchlist`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove from watchlist');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  const formatVolume = (volume) => {
    if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(2)}B`;
    } else if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K`;
    }
    return volume?.toString() || '0';
  };

  if (loading) {
    return (
      <div className="stock-detail-container">
        <div className="loading">Loading stock data...</div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="stock-detail-container">
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const isPositive = quote?.change >= 0;

  return (
    <div className="stock-detail-container">
      <div className="stock-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="header-actions">
          {isInWatchlist ? (
            <button className="btn-warning" onClick={handleRemoveFromWatchlist}>
              Remove from Watchlist
            </button>
          ) : (
            <button className="btn-primary" onClick={handleAddToWatchlist}>
              Add to Watchlist
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="stock-title">
        <h1>{symbol}</h1>
        <div className="price-main">
          <span className="current-price">{formatCurrency(quote?.price)}</span>
          <span className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{quote?.change.toFixed(2)} ({isPositive ? '+' : ''}
            {quote?.changePercent.toFixed(2)}%)
          </span>
        </div>
        <div className="last-updated">
          Last updated: {quote?.timestamp ? new Date(quote.timestamp).toLocaleString() : 'N/A'}
        </div>
      </div>

      <div className="stock-metrics">
        <div className="metric-card">
          <div className="metric-label">Open</div>
          <div className="metric-value">{formatCurrency(quote?.open)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Previous Close</div>
          <div className="metric-value">{formatCurrency(quote?.previousClose)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Day High</div>
          <div className="metric-value">{formatCurrency(quote?.high)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Day Low</div>
          <div className="metric-value">{formatCurrency(quote?.low)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Volume</div>
          <div className="metric-value">{formatVolume(quote?.volume)}</div>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-header">
          <h2>Price History</h2>
          <div className="time-range-buttons">
            <button
              className={`time-range-btn ${timeRange === '1d' ? 'active' : ''}`}
              onClick={() => setTimeRange('1d')}
            >
              1D
            </button>
            <button
              className={`time-range-btn ${timeRange === '5d' ? 'active' : ''}`}
              onClick={() => setTimeRange('5d')}
            >
              5D
            </button>
            <button
              className={`time-range-btn ${timeRange === '1mo' ? 'active' : ''}`}
              onClick={() => setTimeRange('1mo')}
            >
              1M
            </button>
            <button
              className={`time-range-btn ${timeRange === '3mo' ? 'active' : ''}`}
              onClick={() => setTimeRange('3mo')}
            >
              3M
            </button>
            <button
              className={`time-range-btn ${timeRange === '6mo' ? 'active' : ''}`}
              onClick={() => setTimeRange('6mo')}
            >
              6M
            </button>
            <button
              className={`time-range-btn ${timeRange === '1y' ? 'active' : ''}`}
              onClick={() => setTimeRange('1y')}
            >
              1Y
            </button>
          </div>
        </div>

        {historicalData.length > 0 ? (
          <div className="chart-container">
            <SimpleLineChart data={historicalData} />
          </div>
        ) : (
          <div className="chart-placeholder">
            <p>No historical data available</p>
          </div>
        )}
      </div>

      {historicalData.length > 0 && (
        <div className="historical-data-table">
          <h2>Historical Data</h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Open</th>
                  <th>High</th>
                  <th>Low</th>
                  <th>Close</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {historicalData.slice().reverse().slice(0, 30).map((data, index) => (
                  <tr key={index}>
                    <td>{new Date(data.timestamp).toLocaleDateString()}</td>
                    <td>{formatCurrency(data.open)}</td>
                    <td>{formatCurrency(data.high)}</td>
                    <td>{formatCurrency(data.low)}</td>
                    <td>{formatCurrency(data.close)}</td>
                    <td>{formatVolume(data.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple line chart component
function SimpleLineChart({ data }) {
  if (!data || data.length === 0) return null;

  const width = 1000;
  const height = 400;
  const padding = 40;

  // Find min and max values
  const prices = data.map(d => d.close).filter(p => p !== null);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Create points for the line
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.close - minPrice) / priceRange) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  // Determine color based on first and last price
  const firstPrice = data[0]?.close;
  const lastPrice = data[data.length - 1]?.close;
  const lineColor = lastPrice >= firstPrice ? '#27ae60' : '#e74c3c';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="price-chart">
      {/* Grid lines */}
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e0e0e0" strokeWidth="1" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e0e0e0" strokeWidth="1" />

      {/* Price line */}
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
      />

      {/* Price labels */}
      <text x="5" y={padding} fontSize="12" fill="#666">
        {maxPrice.toFixed(2)}
      </text>
      <text x="5" y={height - padding} fontSize="12" fill="#666">
        {minPrice.toFixed(2)}
      </text>
    </svg>
  );
}

export default StockDetail;
