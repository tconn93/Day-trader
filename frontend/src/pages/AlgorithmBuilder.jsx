import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { algorithmsAPI } from '../services/api';
import '../styles/AlgorithmBuilder.css';

function AlgorithmBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [algorithm, setAlgorithm] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [newRule, setNewRule] = useState({
    rule_type: 'entry',
    condition_field: 'price',
    condition_operator: '>',
    condition_value: '',
    action: 'buy:10',
    order_index: 0
  });

  useEffect(() => {
    fetchAlgorithm();
  }, [id]);

  const fetchAlgorithm = async () => {
    try {
      const response = await algorithmsAPI.getById(id);
      setAlgorithm(response.data.algorithm);
      setRules(response.data.rules || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching algorithm:', error);
      setError('Failed to load algorithm');
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setNewRule({
      rule_type: 'entry',
      condition_field: 'price',
      condition_operator: '>',
      condition_value: '',
      action: 'buy:10',
      order_index: rules.length
    });
    setShowRuleModal(true);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setNewRule({
      rule_type: rule.rule_type,
      condition_field: rule.condition_field,
      condition_operator: rule.condition_operator,
      condition_value: rule.condition_value,
      action: rule.action,
      order_index: rule.order_index
    });
    setShowRuleModal(true);
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingRule) {
        await algorithmsAPI.updateRule(id, editingRule.id, newRule);
        setSuccess('Rule updated successfully');
      } else {
        await algorithmsAPI.addRule(id, newRule);
        setSuccess('Rule added successfully');
      }
      setShowRuleModal(false);
      fetchAlgorithm();
    } catch (error) {
      console.error('Error saving rule:', error);
      setError('Failed to save rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      await algorithmsAPI.deleteRule(id, ruleId);
      setSuccess('Rule deleted');
      fetchAlgorithm();
    } catch (error) {
      console.error('Error deleting rule:', error);
      setError('Failed to delete rule');
    }
  };

  const getRuleTypeLabel = (type) => {
    const labels = {
      entry: 'Entry Signal',
      exit: 'Exit Signal',
      stop_loss: 'Stop Loss',
      take_profit: 'Take Profit',
      condition: 'Condition'
    };
    return labels[type] || type;
  };

  const getOperatorLabel = (op) => {
    const labels = {
      '>': 'Greater than',
      '<': 'Less than',
      '>=': 'Greater than or equal',
      '<=': 'Less than or equal',
      '==': 'Equal to',
      '!=': 'Not equal to'
    };
    return labels[op] || op;
  };

  if (loading) {
    return (
      <div className="algorithm-builder">
        <div className="loading">Loading algorithm...</div>
      </div>
    );
  }

  if (!algorithm) {
    return (
      <div className="algorithm-builder">
        <div className="error">Algorithm not found</div>
      </div>
    );
  }

  return (
    <div className="algorithm-builder">
      <div className="builder-header">
        <button className="btn-back" onClick={() => navigate('/algorithms')}>
          ← Back to Algorithms
        </button>
        <div>
          <h1>{algorithm.name}</h1>
          {algorithm.description && <p>{algorithm.description}</p>}
        </div>
        <button className="btn-primary" onClick={handleAddRule}>
          Add Rule
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="rules-section">
        <h2>Rules ({rules.length})</h2>

        {rules.length === 0 ? (
          <div className="empty-state">
            <p>No rules defined yet. Add your first rule to get started.</p>
            <button className="btn-primary" onClick={handleAddRule}>
              Add First Rule
            </button>
          </div>
        ) : (
          <div className="rules-list">
            {rules.map((rule, index) => (
              <div key={rule.id} className="rule-card">
                <div className="rule-header">
                  <span className="rule-number">#{index + 1}</span>
                  <span className={`rule-type-badge ${rule.rule_type}`}>
                    {getRuleTypeLabel(rule.rule_type)}
                  </span>
                </div>

                <div className="rule-logic">
                  <div className="rule-condition">
                    <strong>IF</strong>
                    <span className="field">{rule.condition_field}</span>
                    <span className="operator">{getOperatorLabel(rule.condition_operator)}</span>
                    <span className="value">{rule.condition_value}</span>
                  </div>
                  <div className="rule-action">
                    <strong>THEN</strong>
                    <span className="action">{rule.action}</span>
                  </div>
                </div>

                <div className="rule-actions">
                  <button className="btn-sm btn-secondary" onClick={() => handleEditRule(rule)}>
                    Edit
                  </button>
                  <button className="btn-sm btn-danger" onClick={() => handleDeleteRule(rule.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showRuleModal && (
        <div className="modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <h2>{editingRule ? 'Edit Rule' : 'Add New Rule'}</h2>
            <form onSubmit={handleSaveRule}>
              <div className="form-row">
                <div className="form-group">
                  <label>Rule Type</label>
                  <select
                    value={newRule.rule_type}
                    onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}
                    required
                  >
                    <option value="entry">Entry Signal</option>
                    <option value="exit">Exit Signal</option>
                    <option value="stop_loss">Stop Loss</option>
                    <option value="take_profit">Take Profit</option>
                    <option value="condition">Condition</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Order Index</label>
                  <input
                    type="number"
                    value={newRule.order_index}
                    onChange={(e) => setNewRule({ ...newRule, order_index: parseInt(e.target.value) })}
                    min="0"
                    required
                  />
                  <small>Lower numbers execute first</small>
                </div>
              </div>

              <h3>Condition</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Field</label>
                  <select
                    value={newRule.condition_field}
                    onChange={(e) => setNewRule({ ...newRule, condition_field: e.target.value })}
                    required
                  >
                    <option value="price">Price</option>
                    <option value="open">Open</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                    <option value="volume">Volume</option>
                    <option value="change">Change</option>
                    <option value="changePercent">Change %</option>
                    <option value="sma_20">SMA 20</option>
                    <option value="sma_50">SMA 50</option>
                    <option value="rsi">RSI</option>
                    <option value="position.quantity">Position Quantity</option>
                    <option value="position.unrealizedPL">Position P/L</option>
                    <option value="position.unrealizedPLPercent">Position P/L %</option>
                    <option value="balance">Account Balance</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Operator</label>
                  <select
                    value={newRule.condition_operator}
                    onChange={(e) => setNewRule({ ...newRule, condition_operator: e.target.value })}
                    required
                  >
                    <option value=">">Greater than (&gt;)</option>
                    <option value="<">Less than (&lt;)</option>
                    <option value=">=">Greater than or equal (&gt;=)</option>
                    <option value="<=">Less than or equal (&lt;=)</option>
                    <option value="==">Equal to (==)</option>
                    <option value="!=">Not equal to (!=)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Value</label>
                  <input
                    type="text"
                    value={newRule.condition_value}
                    onChange={(e) => setNewRule({ ...newRule, condition_value: e.target.value })}
                    placeholder="e.g., 100, sma_50"
                    required
                  />
                  <small>Numeric value or field name</small>
                </div>
              </div>

              <h3>Action</h3>
              <div className="form-group">
                <label>Action</label>
                <input
                  type="text"
                  value={newRule.action}
                  onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                  placeholder="e.g., buy:10, sell:all, buy:50%"
                  required
                />
                <small>
                  Examples: buy:10 (buy 10 shares), sell:all (sell all shares),
                  buy:50% (buy with 50% of balance), sell:25% (sell 25% of position)
                </small>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowRuleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingRule ? 'Update Rule' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlgorithmBuilder;
