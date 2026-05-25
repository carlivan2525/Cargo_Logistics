const { RATE_PER_KM, MIN_CHARGE } = require('./pricing');
const RateConfig = require('../models/RateConfig');

const rateConfig = {
  ratePerKm: { ...RATE_PER_KM },
  minCharge:  { ...MIN_CHARGE },
};

async function loadRateConfig() {
  try {
    let doc = await RateConfig.findOne();
    if (!doc) {
      doc = await RateConfig.create({ ratePerKm: RATE_PER_KM, minCharge: MIN_CHARGE });
    }
    // Mixed type — just assign directly
    const r = doc.ratePerKm ?? {};
    const m = doc.minCharge  ?? {};
    // Merge: keep DB values, fill missing keys from defaults
    for (const v of Object.keys(RATE_PER_KM)) {
      rateConfig.ratePerKm[v] = r[v] ?? RATE_PER_KM[v];
      rateConfig.minCharge[v]  = m[v] ?? MIN_CHARGE[v];
    }
  } catch (err) {
    console.error('[rateConfig] load failed, using defaults:', err.message);
  }
}

module.exports = { rateConfig, loadRateConfig };
