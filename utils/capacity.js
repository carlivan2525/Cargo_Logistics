/**
 * Parse weight/capacity values:
 * - "4T", "1.5T", "10 tons" → numeric kg (multiply by 1000)
 * - "500kg", "500 kg"       → numeric kg
 * - "0.5", "500" (plain)    → treated as kg directly
 */
function parseKg(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();

  // Tons: "4T", "1.5T", "10 tons"
  const tonsMatch = s.match(/^([\d.]+)\s*T(ons?)?$/i);
  if (tonsMatch) return parseFloat(tonsMatch[1]) * 1000;

  // Kilograms: "500kg", "500 kg"
  const kgMatch = s.match(/^([\d.]+)\s*kg$/i);
  if (kgMatch) return parseFloat(kgMatch[1]);

  // Plain number — treat as kg
  const plain = parseFloat(s);
  if (!isNaN(plain)) return plain;

  return null;
}

function canVehicleCarryLoad(vehicle, loadWeight) {
  const loadKg     = parseKg(loadWeight);
  const capacityKg = parseKg(vehicle?.capacity);

  if (loadKg == null) {
    // No weight provided — skip capacity check, allow acceptance
    return { ok: true };
  }
  if (capacityKg == null) {
    return { ok: false, message: 'Cannot proceed: vehicle capacity is invalid.' };
  }
  if (loadKg > capacityKg) {
    return {
      ok: false,
      message: `Cannot proceed with this vehicle. Load is ${loadKg}kg but ${vehicle.name} (${vehicle.plate}) can only carry ${capacityKg}kg.`,
    };
  }
  return { ok: true };
}

module.exports = { parseKg, canVehicleCarryLoad };
