import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { algorithmsAPI, paperTradingAPI } from '../services/api';
import '../styles/Algorithms.css';

function Algorithms() {
  const navigate = useNavigate();
  const [algorithms, setAlgorithms] = useState([]);
  const [runningAlgorithms, setRunningAlgorithms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlgorithm, setNewAlgorithm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAlgorithms();
    fetchRunningAlgorithms();
  }, []);

  const fetchAlgorithms = async () => {
    try {
      const response = await algorithmsAPI.getAll();
      setAlgorithms(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching algorithms:', error);
      setError('Failed to load algorithms');
      setLoading(false);
    }
  };

  const fetchRunningAlgorithms = async () => {
    try {
      const response = await paperTradingAPI.getRunningAlgorithms();
      setRunningAlgorithms(response.data);
    } catch (error) {
      console.error('Error fetching running algorithms:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newAlgorithm.name.trim()) {
      setError('Algorithm name is required');
      return;
    }

    try {
      await algorithmsAPI.create(newAlgorithm.name, newAlgorithm.description);
      setSuccess('Algorithm created successfully');
      setShowCreateModal(false);
      setNewAlgorithm({ name: '', description: '' });
      fetchAlgorithms();
    } catch (error) {
      console.error('Error creating algorithm:', error);
      setError('Failed to create algorithm');
    }
  };

  const handleToggle = async (id) => {
    try {
      await algorithmsAPI.toggle(id);
      fetchAlgorithms();
      setSuccess('Algorithm status updated');
    } catch (error) {
      console.error('Error toggling algorithm:', error);
      setError('Failed to update algorithm status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this algorithm?')) {
      return;
    }

    try {
      await algorithmsAPI.delete(id);
      fetchAlgorithms();
      setSuccess('Algorithm deleted');
    } catch (error) {
      console.error('Error deleting algorithm:', error);
      setError('Failed to delete algorithm');
    }
  };

  const handleStartExecution = async (id) => {
    try {
      await paperTradingAPI.startAlgorithm(id, ['AAPL']); // Default symbol
      setSuccess('Algorithm execution started');
      fetchRunningAlgorithms();
    } catch (error) {
      console.error('Error starting algorithm:', error);
      setError(error.response?.data?.error || 'Failed to start algorithm');
    }
  };

  const handleStopExecution = async (id) => {
    try {
      await paperTradingAPI.stopAlgorithm(id);
      setSuccess('Algorithm execution stopped');
      fetchRunningAlgorithms();
    } catch (error) {
      console.error('Error stopping algorithm:', error);
      setError('Failed to stop algorithm');
    }
  };

  const isRunning = (id) => runningAlgorithms.includes(id);

  if (loading) {
    return (
      <div className="algorithms-container">
        <div className="loading">Loading algorithms...</div>
      </div>
    );
  }

  return (
    <div className="algorithms-container">
      <div className="algorithms-header">
        <div>
          <h1>Trading Algorithms</h1>
          <p>Create and manage your automated trading strategies</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          Create Algorithm
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {algorithms.length === 0 ? (
        <div className="empty-state">
          <h2>No algorithms yet</h2>
          <p>Create your first trading algorithm to get started</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            Create Algorithm
          </button>
        </div>
      ) : (
        <div className="algorithms-grid">
          {algorithms.map((algo) => (
            <div key={algo.id} className="algorithm-card">
              <div className="algorithm-header">
                <h3>{algo.name}</h3>
                <div className="algorithm-status">
                  <span className={`status-badge ${algo.is_active ? 'active' : 'inactive'}`}>
                    {algo.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {isRunning(algo.id) && (
                    <span className="status-badge running">Running</span>
                  )}
                </div>
              </div>

              {algo.description && (
                <p className="algorithm-description">{algo.description}</p>
              )}

              <div className="algorithm-meta">
                <span>Created: {new Date(algo.created_at).toLocaleDateString()}</span>
                <span>Updated: {new Date(algo.updated_at).toLocaleDateString()}</span>
              </div>

              <div className="algorithm-actions">
                <button
                  className="btn-secondary"
                  onClick={() => navigate(`/algorithms/${algo.id}`)}
                >
                  Edit Rules
                </button>
                <button
                  className={`btn-${algo.is_active ? 'warning' : 'success'}`}
                  onClick={() => handleToggle(algo.id)}
                >
                  {algo.is_active ? 'Deactivate' : 'Activate'}
                </button>
                {algo.is_active && !isRunning(algo.id) && (
                  <button
                    className="btn-success"
                    onClick={() => handleStartExecution(algo.id)}
                  >
                    Start Execution
                  </button>
                )}
                {isRunning(algo.id) && (
                  <button
                    className="btn-warning"
                    onClick={() => handleStopExecution(algo.id)}
                  >
                    Stop Execution
                  </button>
                )}
                <button
                  className="btn-secondary"
                  onClick={() => navigate(`/backtest/${algo.id}`)}
                >
                  Backtest
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(algo.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Algorithm</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Algorithm Name</label>
                <input
                  type="text"
                  value={newAlgorithm.name}
                  onChange={(e) => setNewAlgorithm({ ...newAlgorithm, name: e.target.value })}
                  placeholder="e.g., MA Crossover Strategy"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={newAlgorithm.description}
                  onChange={(e) => setNewAlgorithm({ ...newAlgorithm, description: e.target.value })}
                  placeholder="Describe your trading strategy..."
                  rows="4"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Algorithms;
