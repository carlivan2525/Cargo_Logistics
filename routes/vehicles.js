const express = require('express');
const Vehicle = require('../models/Vehicle');
const auth = require('../middleware/auth');
const router = express.Router();

// GET all
router.get('/', auth, async (req, res) => {
  try {
    res.json(await Vehicle.find().sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// POST create
router.post('/', auth, async (req, res) => {
  try {
    const count = await Vehicle.countDocuments();
    const vehicle = new Vehicle({
      vehicleId: `VH-${String(count + 1).padStart(3, '0')}`,
      ...req.body,
    });
    res.status(201).json(await vehicle.save());
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update status / fields
router.put('/:id', auth, async (req, res) => {
  try {
    res.json(await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// PUT upload vehicle image (base64)
router.put('/:id/image', auth, async (req, res) => {
  try {
    const { image } = req.body; // base64 data URL
    if (!image) return res.status(400).json({ message: 'image is required' });
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { image }, { new: true });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ image: vehicle.image });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
