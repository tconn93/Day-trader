import express from 'express';
import { body, validationResult } from 'express-validator';
import TradingAlgorithm from '../models/TradingAlgorithm.js';
import AlgorithmRule from '../models/AlgorithmRule.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(authenticateToken);

// Get all algorithms for the user
router.get('/', async (req, res) => {
  try {
    const algorithms = await TradingAlgorithm.findByUserId(req.user.id);
    res.json({ algorithms });
  } catch (error) {
    console.error('Get algorithms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get algorithm by ID with its rules
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const algorithm = await TradingAlgorithm.findById(id, req.user.id);

    if (!algorithm) {
      return res.status(404).json({ error: 'Algorithm not found' });
    }

    const rules = await AlgorithmRule.findByAlgorithmId(id);

    res.json({
      algorithm: {
        ...algorithm,
        rules
      }
    });
  } catch (error) {
    console.error('Get algorithm error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new algorithm
router.post(
  '/',
  [
    body('name').trim().notEmpty().isLength({ min: 1, max: 100 }),
    body('description').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    try {
      const algorithm = await TradingAlgorithm.create(req.user.id, name, description);
      res.status(201).json({
        message: 'Algorithm created successfully',
        algorithm
      });
    } catch (error) {
      console.error('Create algorithm error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update algorithm
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('is_active').optional().isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    try {
      const result = await TradingAlgorithm.update(id, req.user.id, updates);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Algorithm not found' });
      }

      res.json({ message: 'Algorithm updated successfully' });
    } catch (error) {
      console.error('Update algorithm error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete algorithm
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await TradingAlgorithm.delete(id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Algorithm not found' });
    }

    res.json({ message: 'Algorithm deleted successfully' });
  } catch (error) {
    console.error('Delete algorithm error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle algorithm active status
router.patch('/:id/toggle', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await TradingAlgorithm.toggleActive(id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Algorithm not found' });
    }

    res.json({ message: 'Algorithm status toggled successfully' });
  } catch (error) {
    console.error('Toggle algorithm error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add rule to algorithm
router.post(
  '/:id/rules',
  [
    body('rule_type').trim().notEmpty(),
    body('condition_field').trim().notEmpty(),
    body('condition_operator').trim().notEmpty().isIn(['>', '<', '>=', '<=', '==', '!=']),
    body('condition_value').trim().notEmpty(),
    body('action').trim().notEmpty(),
    body('order_index').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
      // Verify algorithm belongs to user
      const algorithm = await TradingAlgorithm.findById(id, req.user.id);
      if (!algorithm) {
        return res.status(404).json({ error: 'Algorithm not found' });
      }

      const rule = await AlgorithmRule.create(id, req.body);
      res.status(201).json({
        message: 'Rule added successfully',
        rule
      });
    } catch (error) {
      console.error('Add rule error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update rule
router.put(
  '/:algorithmId/rules/:ruleId',
  [
    body('rule_type').optional().trim().notEmpty(),
    body('condition_field').optional().trim().notEmpty(),
    body('condition_operator').optional().trim().notEmpty().isIn(['>', '<', '>=', '<=', '==', '!=']),
    body('condition_value').optional().trim().notEmpty(),
    body('action').optional().trim().notEmpty(),
    body('order_index').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { algorithmId, ruleId } = req.params;

    try {
      // Verify algorithm belongs to user
      const algorithm = await TradingAlgorithm.findById(algorithmId, req.user.id);
      if (!algorithm) {
        return res.status(404).json({ error: 'Algorithm not found' });
      }

      const result = await AlgorithmRule.update(ruleId, req.body);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      res.json({ message: 'Rule updated successfully' });
    } catch (error) {
      console.error('Update rule error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete rule
router.delete('/:algorithmId/rules/:ruleId', async (req, res) => {
  const { algorithmId, ruleId } = req.params;

  try {
    // Verify algorithm belongs to user
    const algorithm = await TradingAlgorithm.findById(algorithmId, req.user.id);
    if (!algorithm) {
      return res.status(404).json({ error: 'Algorithm not found' });
    }

    const result = await AlgorithmRule.delete(ruleId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
