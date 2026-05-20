/**
 * Basic ANSI X12 204 → internal fields (demo parser).
 * Production EDI usually needs a full validator (Stedi, Cleo, etc.).
 */

function looksLikeX12(text) {
  return typeof text === 'string' && /ISA\*[^~]+~/i.test(text);
}

function parseEdi204(raw) {
  if (!looksLikeX12(raw)) {
    throw new Error('Not valid X12 (expected ISA segment)');
  }

  const segments = raw.replace(/\r\n/g, '').replace(/\n/g, '').split('~').map((s) => s.trim()).filter(Boolean);

  const l11Value = (el) => {
    const description = (el[3] || '').trim();
    if (description) return description;
    return (el[2] || '').trim();
  };
  const out = {
    isaId: null,
    orderId: null,
    shipmentId: null,
    route: null,
    weight: null,
    commodity: null,
    pickupDate: null,
    deliveryDate: null,
    isaSegment: segments.find((s) => s.startsWith('ISA*')) || null,
  };

  const stops = [];

  for (const seg of segments) {
    const el = seg.split('*');
    const id = el[0];

    if (id === 'ISA') {
      const sender = (el[6] || '').trim();
      const receiver = (el[8] || '').trim();
      out.isaId = sender || receiver;
    }

    if (id === 'B2') {
      out.shipmentId = (el[2] || el[4] || '').trim() || out.shipmentId;
    }

    if (id === 'AT8') {
      const w = parseFloat(el[3] || el[2]);
      if (!Number.isNaN(w)) out.weight = `${w}T`;
    }

    if (id === 'L11') {
      const ref = (el[1] || '').toUpperCase();
      const val = l11Value(el);
      if (ref === 'BM' || ref === 'SI') out.shipmentId = val || out.shipmentId;
      if (ref === 'ON' || ref === 'PO') out.orderId = val || out.orderId;
      if (ref === 'RT' || ref === 'RO') out.route = val || out.route;
      if (ref === 'CN' || ref === 'CO') out.commodity = val || out.commodity;
    }

    if (id === 'N1') {
      const name = (el[2] || '').trim();
      if (name) stops.push(name);
    }

    if (id === 'G62' && el[2]) {
      const code = (el[1] || '').trim();
      const raw = (el[2] || '').trim();
      if (raw.length === 8) {
        const d = new Date(
          `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
        );
        if (!Number.isNaN(d.getTime())) {
          if (code === '10' || code === '37') out.pickupDate = d;
          if (code === '68' || code === '17') out.deliveryDate = d;
        }
      }
    }
  }

  if (!out.route && stops.length >= 2) {
    out.route = `${stops[0]} - ${stops[1]}`;
  } else if (!out.route && stops.length === 1) {
    out.route = stops[0];
  }

  if (!out.isaId) throw new Error('Could not read partner ISA ID from X12');
  if (!out.route) throw new Error('Could not read route from X12 (use L11*RT*... or two N1 stops)');

  return out;
}

/** JSON body, or { rawEdi } wrapper — JSON fields win if both sent */
function normalize204Input(body) {
  if (!body) throw new Error('Request body is empty');

  if (body.rawEdi && looksLikeX12(body.rawEdi)) {
    const parsed = parseEdi204(body.rawEdi);
    return {
      isaId: body.isaId || parsed.isaId,
      orderId: body.orderId || parsed.orderId,
      route: body.route || parsed.route,
      weight: body.weight || parsed.weight || '',
      commodity: body.commodity || parsed.commodity || '',
      shipmentId: body.shipmentId || parsed.shipmentId,
      pickupDate: body.pickupDate ?? body.scheduledPickupDate ?? parsed.pickupDate,
      deliveryDate: body.deliveryDate ?? body.estimatedDeliveryDate ?? parsed.deliveryDate,
      rawEdi: body.rawEdi,
      isaSegment: parsed.isaSegment,
    };
  }

  return {
    isaId: body.isaId,
    orderId: body.orderId,
    route: body.route,
    weight: body.weight || '',
    commodity: body.commodity || '',
    shipmentId: body.shipmentId,
    pickupDate: body.pickupDate ?? body.scheduledPickupDate ?? null,
    deliveryDate: body.deliveryDate ?? body.estimatedDeliveryDate ?? null,
    rawEdi: body.rawEdi || null,
    isaSegment: null,
  };
}

module.exports = { looksLikeX12, parseEdi204, normalize204Input };
