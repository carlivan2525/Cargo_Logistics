const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const Vehicle  = require('../models/Vehicle');
const auth     = require('../middleware/auth');

const router = express.Router();

// ── Multer storage config ─────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'vehicles');

// Ensure the uploads directory exists at startup
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    // e.g. VH-001_1716800000000.png
    const ext  = path.extname(file.originalname).toLowerCase() || '.png';
    const name = `${req.params.id}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

// ── Routes ────────────────────────────────────────────────────────────────────

// GET all
router.get('/', auth, async (req, res) => {
  try {
    res.json(await Vehicle.find().sort({ createdAt: -1 }));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
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
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT upload vehicle image — multipart/form-data, field name: "image"
router.put('/:id/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'image file is required' });

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    // Delete the old image file if it was a local upload (not a Base64 string)
    if (vehicle.image && vehicle.image.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', vehicle.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    // Store the URL path (e.g. /uploads/vehicles/VH-001_1716800000000.png)
    const imageUrl = `/uploads/vehicles/${req.file.filename}`;
    const updated  = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { image: imageUrl },
      { new: true }
    );

    res.json({ image: updated.image });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
