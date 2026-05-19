const express = require('express');
const Transmission = require('../models/Transmission');
const auth = require('../middleware/auth');
const router = express.Router();

// GET all
router.get('/', auth, async (req, res) => {
  try {
    res.json(await Transmission.find()
      .populate('partner', 'name')
      .populate('shipment', 'shipmentId')
      .sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
