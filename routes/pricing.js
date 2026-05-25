const express = require('express');
const auth = require('../middleware/auth');
const { calculateFreight, RATE_PER_KM, MIN_CHARGE, PH_CITIES, getCityCoords } = require('../utils/pricing');
const RateConfig = require('../models/RateConfig');
const { rateConfig, loadRateConfig } = require('../utils/rateConfig');
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

// GET rate config — loads from DB first
router.get('/config', auth, async (req, res) => {
  try {
    await loadRateConfig();
    res.json(rateConfig);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT rate config — persists to MongoDB
router.put('/config', auth, async (req, res) => {
  const { ratePerKm, minCharge } = req.body;
  if (!ratePerKm || !minCharge) {
    return res.status(400).json({ message: 'ratePerKm and minCharge are required' });
  }
  try {
    // Accept all keys from the request body
    const newRatePerKm = {};
    const newMinCharge = {};
    for (const v of Object.keys(ratePerKm)) {
      newRatePerKm[v] = Number(ratePerKm[v]);
    }
    for (const v of Object.keys(minCharge)) {
      newMinCharge[v] = Number(minCharge[v]);
    }
    Object.assign(rateConfig.ratePerKm, newRatePerKm);
    Object.assign(rateConfig.minCharge,  newMinCharge);

    await RateConfig.findOneAndUpdate(
      {},
      { $set: { ratePerKm: rateConfig.ratePerKm, minCharge: rateConfig.minCharge } },
      { upsert: true, new: true }
    );
    res.json(rateConfig);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST calculate — body: { route, vehicleType }
router.post('/calculate', auth, async (req, res) => {
  const { route, vehicleType } = req.body;
  if (!route || !vehicleType) {
    return res.status(400).json({ message: 'route and vehicleType are required' });
  }
  try {
    await loadRateConfig();
    const result = calculateFreight(route, vehicleType, rateConfig.ratePerKm, rateConfig.minCharge);
    if (result.error) return res.status(422).json({ message: result.error });
    const originCoords = getCityCoords(result.origin);
    const destCoords   = getCityCoords(result.destination);
    res.json({ ...result, originCoords, destCoords });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
