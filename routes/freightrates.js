const express = require('express');
const FreightRate = require('../models/FreightRate');
const auth = require('../middleware/auth');
const router = express.Router();

// GET all
router.get('/', auth, async (req, res) => {
  try {
    res.json(await FreightRate.find().sort({ route: 1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// POST create
router.post('/', auth, async (req, res) => {
  try {
    const rate = await FreightRate.create(req.body);
    res.status(201).json(rate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', auth, async (req, res) => {
  try {
    const rate = await FreightRate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!rate) return res.status(404).json({ message: 'Rate not found' });
    res.json(rate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
  try {
    await FreightRate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
