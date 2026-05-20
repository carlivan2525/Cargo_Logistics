const express = require('express');
const Transmission = require('../models/Transmission');
const auth = require('../middleware/auth');
const router = express.Router();

// GET all — paginated
router.get('/', auth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 10;
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Transmission.find()
        .populate('partner', 'name')
        .populate('shipment', 'shipmentId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transmission.countDocuments(),
    ]);

    res.json({ data, total, page, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
