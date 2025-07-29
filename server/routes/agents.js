const express = require('express');
const {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent
} = require('../controllers/agentController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// POST /api/agents
router.post('/', createAgent);

// GET /api/agents
router.get('/', getAgents);

// GET /api/agents/:id
router.get('/:id', getAgentById);

// PUT /api/agents/:id
router.put('/:id', updateAgent);

// DELETE /api/agents/:id
router.delete('/:id', deleteAgent);

module.exports = router;