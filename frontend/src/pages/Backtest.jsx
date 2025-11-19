import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { algorithmsAPI, backtestAPI } from '../services/api';
import '../styles/Backtest.css';

function Backtest() {
  const { algorithmId } = useParams();
  const navigate = useNavigate();
  const [algorithm, setAlgorithm] = useState(null);
  const [backtests, setBacktests] = useState([]);
  const [selectedBacktest, setSelectedBacktest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState({
    symbol: 'AAPL',
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    initialCapital: 100000,
    interval: '1d'
  });

  useEffect(() => {
    fetchAlgorithm();
    fetchBacktests();
  }, [algorithmId]);

  const fetchAlgorithm = async () => {
    try {
      const response = await algorithmsAPI.getById(algorithmId);
      setAlgorithm(response.data.algorithm);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching algorithm:', error);
      setError('Failed to load algorithm');
      setLoading(false);
    }
  };

  const fetchBacktests = async () => {
    try {
      const response = await backtestAPI.getByAlgorithm(algorithmId);
      setBacktests(response.data);
    } catch (error) {
      console.error('Error fetching backtests:', error);
    }
  };

  const handleRunBacktest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setRunning(true);

    try {
      const result = await backtestAPI.run(
        parseInt(algorithmId),
        config.symbol.toUpperCase(),
        config.startDate,
        config.endDate,
        parseFloat(config.initialCapital),
        config.interval
      );

      setSuccess('Backtest completed successfully!');
      setSelectedBacktest(result.data);
      fetchBacktests();
    } catch (error) {
      console.error('Error running backtest:', error);
      setError(error.response?.data?.error || 'Failed to run backtest');
    } finally {
      setRunning(false);
    }
  };

  const handleViewBacktest = async (backtestId) => {
    try {
      const response = await backtestAPI.getById(backtestId);
      const backtest = response.data;

      if (backtest.results_json) {
        const results = JSON.parse(backtest.results_json);
        setSelectedBacktest({
          ...backtest,
          ...results
        });
      } else {
        setSelectedBacktest(backtest);
      }
    } catch (error) {
      console.error('Error loading backtest:', error);
      setError('Failed to load backtest details');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    const num = parseFloat(value || 0);
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="backtest-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!algorithm) {
    return (
      <div className="backtest-container">
        <div className="error">Algorithm not found</div>
      </div>
    );
  }

  return (
    <div className="backtest-container">
      <div className="backtest-header">
        <button className="btn-back" onClick={() => navigate('/algorithms')}>
          ← Back to Algorithms
        </button>
        <div>
          <h1>Backtest: {algorithm.name}</h1>
          <p>Test your algorithm with historical data</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="backtest-layout">
        <div className="backtest-sidebar">
          <div className="sidebar-section">
            <h2>Run New Backtest</h2>
            <form onSubmit={handleRunBacktest}>
              <div className="form-group">
                <label>Symbol</label>
                <input
                  type="text"
                  value={config.symbol}
                  onChange={(e) => setConfig({ ...config, symbol: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                  required
                  disabled={running}
                />
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={config.startDate}
                  onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                  required
                  disabled={running}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={config.endDate}
                  onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  disabled={running}
                />
              </div>
              <div className="form-group">
                <label>Initial Capital</label>
                <input
                  type="number"
                  value={config.initialCapital}
                  onChange={(e) => setConfig({ ...config, initialCapital: e.target.value })}
                  min="1000"
                  step="1000"
                  required
                  disabled={running}
                />
              </div>
              <div className="form-group">
                <label>Interval</label>
                <select
                  value={config.interval}
                  onChange={(e) => setConfig({ ...config, interval: e.target.value })}
                  required
                  disabled={running}
                >
                  <option value="1d">1 Day</option>
                  <option value="1h">1 Hour</option>
                  <option value="30m">30 Minutes</option>
                  <option value="15m">15 Minutes</option>
                </select>
              </div>
              <button
                type="submit"
                className="btn-primary full-width"
                disabled={running}
              >
                {running ? 'Running...' : 'Run Backtest'}
              </button>
            </form>
          </div>

          {backtests.length > 0 && (
            <div className="sidebar-section">
              <h2>Previous Backtests</h2>
              <div className="backtests-list">
                {backtests.map((bt) => (
                  <div
                    key={bt.id}
                    className={`backtest-item ${selectedBacktest?.id === bt.id ? 'active' : ''}`}
                    onClick={() => handleViewBacktest(bt.id)}
                  >
                    <div className="backtest-item-header">
                      <strong>{bt.symbol}</strong>
                      <span className={bt.total_return >= 0 ? 'positive' : 'negative'}>
                        {formatPercent(bt.total_return_percent)}
                      </span>
                    </div>
                    <div className="backtest-item-date">
                      {new Date(bt.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="backtest-results">
          {selectedBacktest ? (
            <>
              <h2>Backtest Results</h2>

              <div className="results-summary">
                <div className="summary-row">
                  <div className="summary-card">
                    <div className="card-label">Initial Capital</div>
                    <div className="card-value">{formatCurrency(selectedBacktest.initial_capital)}</div>
                  </div>
                  <div className="summary-card">
                    <div className="card-label">Final Capital</div>
                    <div className="card-value">{formatCurrency(selectedBacktest.final_capital)}</div>
                  </div>
                  <div className={`summary-card ${selectedBacktest.total_return >= 0 ? 'positive' : 'negative'}`}>
                    <div className="card-label">Total Return</div>
                    <div className="card-value">
                      {formatCurrency(selectedBacktest.total_return)}
                      <span className="card-percent">{formatPercent(selectedBacktest.total_return_percent)}</span>
                    </div>
                  </div>
                </div>

                <div className="summary-row">
                  <div className="summary-card">
                    <div className="card-label">Total Trades</div>
                    <div className="card-value">{selectedBacktest.total_trades}</div>
                  </div>
                  <div className="summary-card">
                    <div className="card-label">Win Rate</div>
                    <div className="card-value">{formatPercent(selectedBacktest.win_rate)}</div>
                  </div>
                  <div className="summary-card">
                    <div className="card-label">Winning Trades</div>
                    <div className="card-value positive">{selectedBacktest.winning_trades}</div>
                  </div>
                  <div className="summary-card">
                    <div className="card-label">Losing Trades</div>
                    <div className="card-value negative">{selectedBacktest.losing_trades}</div>
                  </div>
                </div>

                {selectedBacktest.metrics && (
                  <div className="summary-row">
                    <div className="summary-card">
                      <div className="card-label">Max Drawdown</div>
                      <div className="card-value negative">{formatPercent(selectedBacktest.max_drawdown)}</div>
                    </div>
                    <div className="summary-card">
                      <div className="card-label">Sharpe Ratio</div>
                      <div className="card-value">{selectedBacktest.sharpe_ratio?.toFixed(2) || 'N/A'}</div>
                    </div>
                    {selectedBacktest.metrics.avg_win && (
                      <>
                        <div className="summary-card">
                          <div className="card-label">Avg Win</div>
                          <div className="card-value positive">{formatCurrency(selectedBacktest.metrics.avg_win)}</div>
                        </div>
                        <div className="summary-card">
                          <div className="card-label">Avg Loss</div>
                          <div className="card-value negative">{formatCurrency(selectedBacktest.metrics.avg_loss)}</div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {selectedBacktest.trades && selectedBacktest.trades.length > 0 && (
                <div className="trades-section">
                  <h3>Trade History</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Side</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Amount</th>
                        <th>P/L</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBacktest.trades.map((trade, index) => (
                        <tr key={index}>
                          <td>{new Date(trade.timestamp).toLocaleDateString()}</td>
                          <td className={`order-side ${trade.side}`}>{trade.side.toUpperCase()}</td>
                          <td>{trade.quantity}</td>
                          <td>{formatCurrency(trade.price)}</td>
                          <td>{formatCurrency(trade.cost || trade.proceeds)}</td>
                          <td className={trade.pl ? (trade.pl >= 0 ? 'positive' : 'negative') : ''}>
                            {trade.pl ? formatCurrency(trade.pl) : '-'}
                          </td>
                          <td className="reason">{trade.reason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedBacktest.equity_curve && selectedBacktest.equity_curve.length > 0 && (
                <div className="equity-curve-section">
                  <h3>Equity Curve</h3>
                  <div className="equity-chart">
                    <svg viewBox="0 0 800 300" className="chart-svg">
                      {(() => {
                        const data = selectedBacktest.equity_curve;
                        const maxValue = Math.max(...data.map(d => d.total_value));
                        const minValue = Math.min(...data.map(d => d.total_value));
                        const valueRange = maxValue - minValue;
                        const padding = 40;
                        const width = 800 - padding * 2;
                        const height = 300 - padding * 2;

                        const points = data.map((d, i) => {
                          const x = padding + (i / (data.length - 1)) * width;
                          const y = padding + height - ((d.total_value - minValue) / valueRange) * height;
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <>
                            <polyline
                              points={points}
                              fill="none"
                              stroke="#4CAF50"
                              strokeWidth="2"
                            />
                            <text x="10" y="20" fontSize="12" fill="#666">
                              {formatCurrency(maxValue)}
                            </text>
                            <text x="10" y="290" fontSize="12" fill="#666">
                              {formatCurrency(minValue)}
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <h2>No backtest selected</h2>
              <p>Run a new backtest or select from previous results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Backtest;
