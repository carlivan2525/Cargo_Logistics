export function parseKg(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();

  const kgMatch = s.match(/^([\d.]+)\s*kg$/i);
  if (kgMatch) return parseFloat(kgMatch[1]);

  const plain = parseFloat(s);
  if (!isNaN(plain)) return plain;

  return null;
}

export function canVehicleCarryLoad(vehicle, loadWeight) {
  const loadKg     = parseKg(loadWeight);
  const capacityKg = parseKg(vehicle?.capacity);

  if (loadKg == null) return { ok: true }; // no weight info — skip check
  if (capacityKg == null) return { ok: false, message: 'Cannot proceed: vehicle capacity is invalid.' };
  if (loadKg > capacityKg) {
    return {
      ok: false,
      message: `Cannot proceed with this vehicle. Load is ${loadKg}kg but ${vehicle.name} (${vehicle.plate}) can only carry ${capacityKg}kg.`,
    };
  }
  return { ok: true };
}
