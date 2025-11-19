import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paperTradingAPI } from '../services/api';
import '../styles/PaperTrading.css';

function PaperTrading() {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [newOrder, setNewOrder] = useState({
    symbol: '',
    side: 'buy',
    quantity: 1
  });

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const [portfolioRes, ordersRes, transactionsRes] = await Promise.all([
        paperTradingAPI.getPortfolio(),
        paperTradingAPI.getOrders(50),
        paperTradingAPI.getTransactions(50)
      ]);

      setPortfolio(portfolioRes.data);
      setPositions(portfolioRes.data.positions || []);
      setOrders(ordersRes.data);
      setTransactions(transactionsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setError('Failed to load portfolio');
      setLoading(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await paperTradingAPI.placeOrder(
        newOrder.symbol.toUpperCase(),
        newOrder.side,
        parseInt(newOrder.quantity)
      );
      setSuccess(`${newOrder.side === 'buy' ? 'Buy' : 'Sell'} order executed successfully`);
      setShowOrderModal(false);
      setNewOrder({ symbol: '', side: 'buy', quantity: 1 });
      fetchPortfolio();
    } catch (error) {
      console.error('Error placing order:', error);
      setError(error.response?.data?.error || 'Failed to place order');
    }
  };

  const handleResetAccount = async () => {
    if (!window.confirm('Are you sure you want to reset your paper trading account? This will clear all positions and transaction history.')) {
      return;
    }

    try {
      await paperTradingAPI.resetAccount();
      setSuccess('Account reset successfully');
      fetchPortfolio();
    } catch (error) {
      console.error('Error resetting account:', error);
      setError('Failed to reset account');
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
      <div className="paper-trading-container">
        <div className="loading">Loading portfolio...</div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="paper-trading-container">
        <div className="error">Failed to load portfolio</div>
      </div>
    );
  }

  const { account, stats } = portfolio;
  const totalPL = account.total_value - account.initial_balance;
  const totalPLPercent = (totalPL / account.initial_balance) * 100;

  return (
    <div className="paper-trading-container">
      <div className="paper-trading-header">
        <div>
          <h1>Paper Trading Portal</h1>
          <p>Practice trading with virtual money</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowOrderModal(true)}>
            Place Order
          </button>
          <button className="btn-secondary" onClick={handleResetAccount}>
            Reset Account
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="account-summary">
        <div className="summary-card">
          <div className="card-label">Total Value</div>
          <div className="card-value">{formatCurrency(account.total_value)}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">Cash Balance</div>
          <div className="card-value">{formatCurrency(account.balance)}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">Positions Value</div>
          <div className="card-value">{formatCurrency(stats.total_market_value)}</div>
        </div>
        <div className={`summary-card ${totalPL >= 0 ? 'positive' : 'negative'}`}>
          <div className="card-label">Total P/L</div>
          <div className="card-value">
            {formatCurrency(totalPL)}
            <span className="card-percent">{formatPercent(totalPLPercent)}</span>
          </div>
        </div>
      </div>

      <div className="trading-stats">
        <div className="stat-item">
          <span className="stat-label">Open Positions:</span>
          <span className="stat-value">{stats.total_positions || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Trades:</span>
          <span className="stat-value">{stats.filled_orders || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Buy Orders:</span>
          <span className="stat-value">{stats.total_buys || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Sell Orders:</span>
          <span className="stat-value">{stats.total_sells || 0}</span>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Positions
        </button>
        <button
          className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders History
        </button>
        <button
          className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="positions-section">
            <h2>Current Positions</h2>
            {positions.length === 0 ? (
              <div className="empty-state">
                <p>No open positions</p>
                <button className="btn-primary" onClick={() => setShowOrderModal(true)}>
                  Place Your First Order
                </button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Quantity</th>
                    <th>Avg Price</th>
                    <th>Current Price</th>
                    <th>Market Value</th>
                    <th>Unrealized P/L</th>
                    <th>P/L %</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.id}>
                      <td
                        className="symbol clickable-symbol"
                        onClick={() => navigate(`/stocks/${position.symbol}`)}
                      >
                        {position.symbol}
                      </td>
                      <td>{position.quantity}</td>
                      <td>{formatCurrency(position.average_price)}</td>
                      <td>{formatCurrency(position.current_price)}</td>
                      <td>{formatCurrency(position.market_value)}</td>
                      <td className={position.unrealized_pl >= 0 ? 'positive' : 'negative'}>
                        {formatCurrency(position.unrealized_pl)}
                      </td>
                      <td className={position.unrealized_pl_percent >= 0 ? 'positive' : 'negative'}>
                        {formatPercent(position.unrealized_pl_percent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-section">
            <h2>Order History</h2>
            {orders.length === 0 ? (
              <div className="empty-state">
                <p>No orders yet</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{new Date(order.created_at).toLocaleString()}</td>
                      <td
                        className="symbol clickable-symbol"
                        onClick={() => navigate(`/stocks/${order.symbol}`)}
                      >
                        {order.symbol}
                      </td>
                      <td className={`order-side ${order.side}`}>{order.side.toUpperCase()}</td>
                      <td>{order.quantity}</td>
                      <td>{formatCurrency(order.price)}</td>
                      <td>{formatCurrency(order.quantity * order.price)}</td>
                      <td>
                        <span className={`status-badge ${order.status}`}>{order.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions-section">
            <h2>Transaction History</h2>
            {transactions.length === 0 ? (
              <div className="empty-state">
                <p>No transactions yet</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Symbol</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.created_at).toLocaleString()}</td>
                      <td className={`transaction-type ${tx.type}`}>{tx.type.toUpperCase()}</td>
                      <td
                        className={tx.symbol ? 'symbol clickable-symbol' : 'symbol'}
                        onClick={tx.symbol ? () => navigate(`/stocks/${tx.symbol}`) : undefined}
                      >
                        {tx.symbol || '-'}
                      </td>
                      <td>{tx.quantity || '-'}</td>
                      <td>{tx.price ? formatCurrency(tx.price) : '-'}</td>
                      <td className={tx.amount >= 0 ? 'positive' : 'negative'}>
                        {formatCurrency(tx.amount)}
                      </td>
                      <td>{formatCurrency(tx.balance_after)}</td>
                      <td className="description">{tx.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showOrderModal && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Place Order</h2>
            <form onSubmit={handlePlaceOrder}>
              <div className="form-group">
                <label>Symbol</label>
                <input
                  type="text"
                  value={newOrder.symbol}
                  onChange={(e) => setNewOrder({ ...newOrder, symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g., AAPL"
                  required
                />
              </div>
              <div className="form-group">
                <label>Side</label>
                <select
                  value={newOrder.side}
                  onChange={(e) => setNewOrder({ ...newOrder, side: e.target.value })}
                  required
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  value={newOrder.quantity}
                  onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                  min="1"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowOrderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Place Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaperTrading;
