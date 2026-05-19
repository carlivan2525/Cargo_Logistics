const express = require('express');
const Partner = require('../models/Partner');
const auth = require('../middleware/auth');
const router = express.Router();

// GET all
router.get('/', auth, async (req, res) => {
  try {
    res.json(await Partner.find().sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// POST create
router.post('/', auth, async (req, res) => {
  try {
    const count = await Partner.countDocuments();
    const partner = new Partner({
      partnerId: `PTR-${String(count + 1).padStart(3, '0')}`,
      ...req.body,
    });
    res.status(201).json(await partner.save());
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', auth, async (req, res) => {
  try {
    res.json(await Partner.findByIdAndUpdate(req.params.id, req.body, { new: true }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
