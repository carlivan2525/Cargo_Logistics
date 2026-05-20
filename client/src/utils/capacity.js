export function parseTons(value) {
  if (value == null || value === '') return null;
  const match = String(value).trim().match(/([\d.]+)\s*T/i);
  return match ? parseFloat(match[1]) : null;
}

export function canVehicleCarryLoad(vehicle, loadWeight) {
  const loadTons = parseTons(loadWeight);
  const capacityTons = parseTons(vehicle?.capacity);

  if (loadTons == null) {
    return { ok: false, message: 'Cannot proceed: load weight is missing or invalid.' };
  }
  if (capacityTons == null) {
    return { ok: false, message: 'Cannot proceed: vehicle capacity is invalid.' };
  }
  if (loadTons > capacityTons) {
    return {
      ok: false,
      message: `Cannot proceed with this vehicle. Load is ${loadTons}T but ${vehicle.name} (${vehicle.plate}) can only carry ${capacityTons}T.`,
    };
  }
  return { ok: true };
}
