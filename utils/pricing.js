/**
 * Automated distance-based freight pricing for Philippine routes.
 * City coordinates sourced from dr5hn/countries-states-cities-database (v2.6)
 * https://github.com/dr5hn/countries-states-cities-database
 * License: Open Database License (ODbL)
 *
 * Haversine formula for straight-line distance, with a road factor multiplier.
 */

const PH_CITIES = require('./ph-cities');

/**
 * Haversine distance between two lat/lng points (returns km).
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Road distance factor (actual road distance ≈ 1.3× straight-line)
const ROAD_FACTOR = 1.3;

// Base rate per km by vehicle type (PHP)
// Calibrated targets for ~55km Manila-Calamba route:
//   Motorcycle → ~₱715   (₱10/km, min ₱200)
//   L300       → ~₱1,788 (₱25/km, min ₱500)
//   Expander   → ~₱2,145 (₱30/km, min ₱700)
//   Truck      → ~₱5,720 (₱80/km, min ₱1,500)
const RATE_PER_KM = {
  Motorcycle: 10,   // small motorbike, docs/small parcels
  L300:       25,   // small delivery van
  Expander:   30,   // medium van/MPV
  Truck:      80,   // heavy truck (6W/10W)
};

// Minimum charge per trip (PHP)
const MIN_CHARGE = {
  Motorcycle: 200,
  L300:       500,
  Expander:   700,
  Truck:      1500,
};

/**
 * Normalize a city name for lookup (lowercase, trim, strip ñ variants).
 */
function normalizeCity(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/^city of\s+/, '') // "City of Manila" → "manila"
    .trim();
}

/**
 * Look up coordinates for a city name. Returns null if not found.
 * Handles ñ ↔ n substitution so "Dasmarinas" matches "Dasmariñas" and vice versa.
 */
function getCityCoords(cityName) {
  const key = normalizeCity(cityName);
  if (PH_CITIES[key]) return PH_CITIES[key];

  // ñ ↔ n fallback: try replacing n→ñ and ñ→n
  const withEnye    = key.replace(/n/g, '\u00f1');   // n  → ñ
  const withoutEnye = key.replace(/\u00f1/g, 'n');   // ñ  → n
  if (PH_CITIES[withEnye])    return PH_CITIES[withEnye];
  if (PH_CITIES[withoutEnye]) return PH_CITIES[withoutEnye];

  // Partial match fallback (e.g. "Quezon" matches "quezon city")
  // Also try partial match with ñ stripped
  const stripped = key.replace(/\u00f1/g, 'n');
  const match = Object.keys(PH_CITIES).find(k => {
    const ks = k.replace(/\u00f1/g, 'n');
    return ks.includes(stripped) || stripped.includes(ks);
  });
  return match ? PH_CITIES[match] : null;
}

/**
 * Parse a route string like "Manila - Calamba" into [origin, destination].
 */
function parseRoute(route) {
  const parts = route.split(/\s*[-–—]\s*/);
  if (parts.length < 2) return null;
  return [parts[0].trim(), parts[parts.length - 1].trim()];
}

/**
 * Calculate freight amount for a given route and vehicle type.
 * Returns { amount, distanceKm, ratePerKm, vehicleType, origin, destination }.
 * If cities not found, returns { amount: 0, error: '...' }.
 */
function calculateFreight(route, vehicleType) {
  const parsed = parseRoute(route);
  if (!parsed) return { amount: 0, error: 'Invalid route format. Expected "Origin - Destination".' };

  const [originName, destName] = parsed;
  const originCoords = getCityCoords(originName);
  const destCoords   = getCityCoords(destName);

  if (!originCoords) return { amount: 0, error: `City not found in PH database: "${originName}"` };
  if (!destCoords)   return { amount: 0, error: `City not found in PH database: "${destName}"` };

  const straightKm = haversineKm(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
  const distanceKm = Math.round(straightKm * ROAD_FACTOR);
  const ratePerKm  = RATE_PER_KM[vehicleType] ?? RATE_PER_KM.L300;
  const minCharge  = MIN_CHARGE[vehicleType]   ?? MIN_CHARGE.L300;
  const computed   = Math.round(distanceKm * ratePerKm);
  const amount     = Math.max(computed, minCharge);

  return { amount, distanceKm, ratePerKm, vehicleType, origin: originName, destination: destName };
}

module.exports = { calculateFreight, parseRoute, getCityCoords, RATE_PER_KM, MIN_CHARGE, PH_CITIES };
