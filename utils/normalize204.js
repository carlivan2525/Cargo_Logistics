const { normalize204Input: normalizeX12 } = require('./edi204Parser');

function str(v) {
  if (v == null) return '';
  return String(v).trim();
}

function pickAddress(body, prefix, keys) {
  const nested = body[`${prefix}Address`];
  if (nested && typeof nested === 'object') {
    return Object.fromEntries(keys.map((k) => [k, str(nested[k])]));
  }
  const map = {
    locationName: `${prefix}LocationName`,
    facilityName: `${prefix}FacilityName`,
    region: `${prefix}Region`,
    city: `${prefix}City`,
    zipCode: `${prefix}ZipCode`,
    contactPerson: `${prefix}ContactPerson`,
    contactPhone: `${prefix}ContactPhone`,
    deliveryInstructions: `${prefix}DeliveryInstructions`,
  };
  return Object.fromEntries(
    keys.map((k) => [k, str(body[map[k] || `${prefix}${k.charAt(0).toUpperCase()}${k.slice(1)}`])])
  );
}

/** Route = origin city → destination city (customer rule) */
function buildRoute(origin, destination) {
  const from = str(origin?.city);
  const to = str(destination?.city);
  if (from && to) return `${from} - ${to}`;
  return '';
}

/** Full customer 204 payload → internal shape */
function normalizeCustomer204(body) {
  const base = body?.rawEdi ? normalizeX12(body) : normalizeX12(body || {});

  const origin = pickAddress(body, 'origin', [
    'locationName', 'region', 'city', 'zipCode', 'contactPerson', 'contactPhone',
  ]);
  const destination = pickAddress(body, 'destination', [
    'facilityName', 'region', 'city', 'zipCode', 'contactPerson', 'contactPhone', 'deliveryInstructions',
  ]);

  const route = buildRoute(origin, destination) || str(base.route);

  return {
    ...base,
    route,
    carrierId: str(body.carrierId),
    carrierName: str(body.carrierName),
    carrierScac: str(body.carrierScac || body.scacCode),
    pickupDate: body.pickupDate ?? body.scheduledPickupDate ?? base.pickupDate,
    deliveryDate: body.deliveryDate ?? body.estimatedDeliveryDate ?? base.deliveryDate,
    originAddress: origin,
    destinationAddress: destination,
  };
}

module.exports = { normalizeCustomer204, buildRoute };
