import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { watchlistAPI } from '../services/api';

const Dashboard = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [newStock, setNewStock] = useState({ symbol: '', companyName: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const response = await watchlistAPI.getWatchlist();
      setWatchlist(response.data.watchlist);
      setError('');
    } catch (err) {
      setError('Failed to load watchlist');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!newStock.symbol.trim()) {
      setError('Please enter a stock symbol');
      return;
    }

    try {
      await watchlistAPI.addStock(newStock.symbol.toUpperCase(), newStock.companyName);
      setSuccessMessage(`${newStock.symbol.toUpperCase()} added to watchlist`);
      setNewStock({ symbol: '', companyName: '' });
      fetchWatchlist();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add stock');
    }
  };

  const handleRemoveStock = async (symbol) => {
    if (!confirm(`Remove ${symbol} from watchlist?`)) {
      return;
    }

    try {
      await watchlistAPI.removeStock(symbol);
      setSuccessMessage(`${symbol} removed from watchlist`);
      fetchWatchlist();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove stock');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Day Trader Dashboard</h1>
        <div style={styles.userSection}>
          <span style={styles.userName}>Welcome, {user?.name}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.addStockCard}>
          <h2 style={styles.cardTitle}>Add Stock to Watchlist</h2>

          {error && <div style={styles.error}>{error}</div>}
          {successMessage && <div style={styles.success}>{successMessage}</div>}

          <form onSubmit={handleAddStock} style={styles.form}>
            <div style={styles.formRow}>
              <input
                type="text"
                placeholder="Stock Symbol (e.g., AAPL)"
                value={newStock.symbol}
                onChange={(e) =>
                  setNewStock({ ...newStock, symbol: e.target.value.toUpperCase() })
                }
                style={styles.input}
                required
              />
              <input
                type="text"
                placeholder="Company Name (optional)"
                value={newStock.companyName}
                onChange={(e) =>
                  setNewStock({ ...newStock, companyName: e.target.value })
                }
                style={styles.input}
              />
              <button type="submit" style={styles.addButton}>
                Add Stock
              </button>
            </div>
          </form>
        </div>

        <div style={styles.watchlistCard}>
          <h2 style={styles.cardTitle}>My Watchlist</h2>

          {loading ? (
            <p style={styles.loadingText}>Loading watchlist...</p>
          ) : watchlist.length === 0 ? (
            <p style={styles.emptyText}>
              Your watchlist is empty. Add some stocks to get started!
            </p>
          ) : (
            <div style={styles.stockList}>
              {watchlist.map((stock) => (
                <div key={stock.id} style={styles.stockItem}>
                  <div style={styles.stockInfo}>
                    <span style={styles.stockSymbol}>{stock.symbol}</span>
                    {stock.company_name && (
                      <span style={styles.companyName}>{stock.company_name}</span>
                    )}
                    <span style={styles.addedDate}>
                      Added: {new Date(stock.added_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveStock(stock.symbol)}
                    style={styles.removeButton}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: 'white',
    padding: '20px 40px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    color: '#333'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  userName: {
    fontSize: '16px',
    color: '#666'
  },
  logoutButton: {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  main: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  addStockCard: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
  watchlistCard: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    margin: '0 0 20px 0',
    fontSize: '22px',
    color: '#333'
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '15px',
    fontSize: '14px'
  },
  success: {
    backgroundColor: '#efe',
    color: '#2a6',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '15px',
    fontSize: '14px'
  },
  form: {
    width: '100%'
  },
  formRow: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  input: {
    flex: 1,
    minWidth: '200px',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    outline: 'none'
  },
  addButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: '16px'
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: '16px',
    padding: '40px 0'
  },
  stockList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  stockItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    backgroundColor: '#fafafa'
  },
  stockInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  stockSymbol: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#007bff'
  },
  companyName: {
    fontSize: '14px',
    color: '#666'
  },
  addedDate: {
    fontSize: '12px',
    color: '#999'
  },
  removeButton: {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default Dashboard;
