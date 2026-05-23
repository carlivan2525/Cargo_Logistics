const express = require('express');
const auth = require('../middleware/auth');
const { calculateFreight, RATE_PER_KM, MIN_CHARGE, PH_CITIES, getCityCoords } = require('../utils/pricing');
const router = express.Router();

// Sorted city list for dropdowns — computed once at startup
const CITY_LIST = Object.keys(PH_CITIES)
  .map(k => k.charAt(0).toUpperCase() + k.slice(1))
  .sort();

// GET city list for dropdowns
router.get('/cities', auth, (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  const results = q
    ? CITY_LIST.filter(c => c.toLowerCase().includes(q)).slice(0, 50)
    : CITY_LIST.slice(0, 50);
  res.json(results);
});

// GET rate config
router.get('/config', auth, (req, res) => {
  res.json({ ratePerKm: RATE_PER_KM, minCharge: MIN_CHARGE });
});

// POST calculate — body: { route, vehicleType }
router.post('/calculate', auth, (req, res) => {
  const { route, vehicleType } = req.body;
  if (!route || !vehicleType) {
    return res.status(400).json({ message: 'route and vehicleType are required' });
  }
  const result = calculateFreight(route, vehicleType);
  if (result.error) return res.status(422).json({ message: result.error });

  // Include coords so frontend can plot on map
  const originCoords = getCityCoords(result.origin);
  const destCoords   = getCityCoords(result.destination);
  res.json({ ...result, originCoords, destCoords });
});

module.exports = router;
