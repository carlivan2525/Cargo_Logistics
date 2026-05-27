const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const { put, del } = require('@vercel/blob');
const Vehicle  = require('../models/Vehicle');
const auth     = require('../middleware/auth');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'vehicles');

function useBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// Local disk: ensure directory exists
if (!useBlobStorage()) {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

const maxBytes = useBlobStorage()
  ? 3 * 1024 * 1024 // Vercel function request limit is small; keep extra headroom
  : 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

function isVercelBlobUrl(url) {
  return typeof url === 'string'
    && url.startsWith('https://')
    && url.includes('blob.vercel-storage.com');
}

async function removeStoredImage(image) {
  if (!image || typeof image !== 'string') return;

  if (image.startsWith('/uploads/')) {
    // On Vercel, /var/task is read-only. Old local-path entries may still exist in DB.
    // Deletion failure should never block replacing the image with a Blob URL.
    try {
      const filePath = path.join(__dirname, '..', image);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      console.warn('Local file delete skipped (non-fatal):', err.message);
    }
    return;
  }

  if (isVercelBlobUrl(image)) {
    try {
      await del(image, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch (err) {
      console.warn('Blob delete failed (non-fatal):', err.message);
    }
  }
}

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
// Stores a short HTTPS URL (Vercel Blob) when BLOB_READ_WRITE_TOKEN is set; otherwise /uploads/... on disk.
router.put('/:id/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'image file is required' });

    if (process.env.VERCEL && !useBlobStorage()) {
      return res.status(503).json({
        message: 'Vehicle image uploads require Vercel Blob. Add BLOB_READ_WRITE_TOKEN in your Vercel project environment (Storage → Blob).',
      });
    }

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    await removeStoredImage(vehicle.image);

    const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
    let imageUrl;

    if (useBlobStorage()) {
      const pathname = `vehicles/${req.params.id}-${Date.now()}${ext}`;
      const blob = await put(pathname, req.file.buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: req.file.mimetype || 'image/png',
        addRandomSuffix: true,
      });
      imageUrl = blob.url;
    } else {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      const filename = `${req.params.id}_${Date.now()}${ext}`;
      const diskPath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(diskPath, req.file.buffer);
      imageUrl = `/uploads/vehicles/${filename}`;
    }

    const updated = await Vehicle.findByIdAndUpdate(
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
