const express = require('express');
const LoadTender = require('../models/LoadTender');
const Partner = require('../models/Partner');
const Transmission = require('../models/Transmission');
const Shipment = require('../models/Shipment');
const Invoice = require('../models/Invoice');
const Vehicle = require('../models/Vehicle');
const auth = require('../middleware/auth');
const { getPickupAndDeliveryDates, parseDateInput } = require('../utils/dates');
const { canVehicleCarryLoad } = require('../utils/capacity');
const { normalizeCustomer204, buildRoute } = require('../utils/normalize204');
const { calculateFreight } = require('../utils/pricing');
const { loadRateConfig, rateConfig } = require('../utils/rateConfig');
const { nextSequentialId } = require('../utils/ids');
const router = express.Router();

// GET all — populated
router.get('/', auth, async (req, res) => {
  try {
    res.json(await LoadTender.find()
      .populate('partner', 'name isaId')
      .populate('assignedVehicle', 'vehicleId name type plate capacity')
      .sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Plain-text X12 body → { rawEdi } (JSON clients unchanged)
router.post('/', (req, res, next) => {
  if (typeof req.body === 'string' && req.body.includes('ISA*')) {
    req.body = { rawEdi: req.body };
  }
  next();
}, async (req, res) => {
  try {
    const tenderId = await nextSequentialId(LoadTender, 'tenderId', 'TND');
    const trxId = await nextSequentialId(Transmission, 'transmissionId', 'TRX');

    const input = normalizeCustomer204(req.body);
    const {
      route, weight, commodity, isaId, orderId,
      shipmentId: bodyShipmentId, rawEdi, isaSegment,
      pickupDate: rawPickup, deliveryDate: rawDelivery,
      carrierId, carrierName, carrierScac,
      originAddress,
      _destinationForRoute: destinationForRoute,
    } = input;

    if (!isaId) return res.status(400).json({ message: 'isaId is required (e.g. SURPLUS) or send valid X12 in rawEdi' });

    const routeFromCities = buildRoute(originAddress, destinationForRoute);
    const finalRoute = routeFromCities || route;
    if (!finalRoute) {
      return res.status(400).json({
        message: 'Route requires originAddress.city and destinationAddress.city (e.g. Manila - Cebu)',
      });
    }

    const pickupDate = parseDateInput(rawPickup);
    if (!pickupDate) return res.status(400).json({ message: 'pickupDate is required (customer schedule)' });

    const partner = await Partner.findOne({ isaId: isaId.toUpperCase() });
    if (!partner) {
      return res.status(400).json({ message: `Partner not found for isaId: ${isaId}` });
    }

    // Idempotency check — reject duplicate tenders from same partner
    // within 5 minutes with the same orderId or shipmentId
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
    const dupQuery = {
      partner: partner._id,
      status: 'Pending',
      createdAt: { $gte: tenSecondsAgo },
    };
    if (orderId) dupQuery.orderId = orderId;
    else if (bodyShipmentId) dupQuery.shipmentId = bodyShipmentId;
    else dupQuery.route = finalRoute;

    const duplicate = await LoadTender.findOne(dupQuery);
    if (duplicate) {
      return res.status(409).json({
        message: 'Duplicate load tender — a pending tender from this partner already exists.',
        tenderId: duplicate.tenderId,
      });
    }

    const tender = new LoadTender({
      tenderId,
      ediRef: trxId,
      partner: partner._id,
      orderId: orderId || undefined,
      shipmentId: bodyShipmentId || `SHP-${Date.now()}`,
      route: finalRoute,
      carrierId,
      carrierName,
      carrierScac,
      pickupDate,
      deliveryDate: parseDateInput(rawDelivery) || null,
      originAddress,
      weight: weight || '',
      commodity: commodity || '',
      status: 'Pending',
      rawEdi:  rawEdi || null,
      rawJson: rawEdi ? null : req.body, // store original JSON payload if not X12
    });
    await tender.save();

    // Log the inbound 204 transmission
    await new Transmission({
      transmissionId: trxId,
      ediCode:   '204',
      label:     'Load Tender',
      direction: 'IN',
      partner:   tender.partner,
      status:    'Received',
      isaSegment: isaSegment || `ISA*00*...*ZZ*${partner.isaId}*${new Date().toISOString().slice(0,10).replace(/-/g,'')}*^*00501*${trxId.replace('TRX-', '').padStart(9, '0')}*0*P*>`,
    }).save();

    res.status(201).json(await tender.populate('partner', 'name isaId'));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

function buildEdiPipeline(tender, shipment, invoice, transmissions, invoicePdfUrl = null) {
  const rejected = tender.status === 'Rejected';
  const accepted = tender.status === 'Accepted';
  const pending = tender.status === 'Pending';

  const statusRank = { Pending: 0, Pickup: 1, 'In Transit': 2, Delivered: 3 };
  const shipRank = shipment ? (statusRank[shipment.status] ?? -1) : -1;

  const trx204 = transmissions.find(t => t.ediCode === '204' && t.transmissionId === tender.ediRef)
    || transmissions.find(t => t.ediCode === '204');
  const trx990 = transmissions.find(t => t.ediCode === '990');
  const trx214 = (label) => transmissions.find(t =>
    t.ediCode === '214' && (!label || (t.label || '').includes(label))
  );
  const trx210 = transmissions.find(t => t.ediCode === '210');
  const trx820 = transmissions.find(t => t.ediCode === '820');
  const trx997 = transmissions.find(t => t.ediCode === '997');

  const fmtAt = (d) => (d ? new Date(d).toISOString() : null);

  const steps = [
    {
      key: '204',
      code: '204',
      label: 'Load Tender',
      detail: 'Inbound request',
      state: 'done',
      at: fmtAt(trx204?.createdAt || tender.createdAt),
      ref: tender.ediRef || trx204?.transmissionId || null,
    },
    {
      key: '990',
      code: '990',
      label: 'Response',
      detail: rejected ? 'Rejected' : accepted ? 'Accepted' : 'Awaiting acknowledge',
      state: rejected ? 'rejected' : accepted ? 'done' : pending ? 'current' : 'pending',
      at: !pending ? fmtAt(trx990?.createdAt || tender.updatedAt) : null,
      ref: trx990?.transmissionId || null,
    },
  ];

  const after990 = [
    {
      key: '214-pickup',
      code: '214',
      label: 'Pickup',
      detail: 'Shipment status update',
      done: shipRank >= 1,
      trx: trx214('Pickup'),
    },
    {
      key: '214-transit',
      code: '214',
      label: 'In Transit',
      detail: 'Shipment status update',
      done: shipRank >= 2,
      trx: trx214('In Transit'),
    },
    {
      key: '214-delivered',
      code: '214',
      label: 'Delivered',
      detail: 'Shipment status update',
      done: shipRank >= 3,
      trx: trx214('Delivered'),
    },
    {
      key: '210',
      code: '210',
      label: 'Invoice',
      detail: invoice ? `Freight bill · ${invoice.invoiceId}` : 'Freight bill',
      done: Boolean(invoice && (invoice.ediSent || trx210)),
      trx: trx210,
    },
    {
      key: '820',
      code: '820',
      label: 'Payment',
      detail: 'Remittance advice',
      done: invoice?.status === 'Paid' || Boolean(trx820),
      trx: trx820,
    },
    {
      key: '997',
      code: '997',
      label: 'Receipt',
      detail: 'Functional acknowledgement',
      done: Boolean(invoice?.edi997Sent || trx997),
      trx: trx997,
    },
  ];

  if (rejected) {
    for (const s of after990) {
      steps.push({
        key: s.key,
        code: s.code,
        label: s.label,
        detail: s.detail,
        state: 'skipped',
        at: null,
        ref: null,
      });
    }
    return {
      steps,
      shipment: shipment ? { shipmentId: shipment.shipmentId, status: shipment.status, route: shipment.route, estimatedDeliveryDate: shipment.estimatedDeliveryDate } : null,
      invoice: null,
    };
  }

  if (!accepted) {
    for (const s of after990) {
      steps.push({
        key: s.key,
        code: s.code,
        label: s.label,
        detail: s.detail,
        state: 'pending',
        at: null,
        ref: null,
      });
    }
    return { steps, shipment: null, invoice: null };
  }

  let foundCurrent = false;
  for (const s of after990) {
    let state = 'pending';
    if (s.done) {
      state = 'done';
    } else if (!foundCurrent) {
      state = 'current';
      foundCurrent = true;
    }
    steps.push({
      key: s.key,
      code: s.code,
      label: s.label,
      detail: s.detail,
      state,
      at: fmtAt(s.trx?.createdAt || (s.key === '214-delivered' && shipment?.deliveredAt) || null),
      ref: s.trx?.transmissionId || null,
    });
  }

  return {
    steps,
    shipment: shipment ? {
      shipmentId: shipment.shipmentId,
      status: shipment.status,
      route: shipment.route,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate,
    } : null,
    invoice: invoice ? {
      invoiceId: invoice.invoiceId,
      status: invoice.status,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      ediSent: invoice.ediSent,
      edi997Sent: invoice.edi997Sent,
      shipmentId: shipment?.shipmentId,
      route: shipment?.route,
      pdfUrl: invoicePdfUrl,
    } : null,
  };
}

// GET EDI pipeline for a tender (204 → 997)
router.get('/:id/pipeline', auth, async (req, res) => {
  try {
    const tender = await LoadTender.findById(req.params.id).populate('partner', 'name isaId');
    if (!tender) return res.status(404).json({ message: 'Tender not found' });

    const shipment = await Shipment.findOne({ tender: tender._id }).sort({ createdAt: -1 });
    const invoice = shipment
      ? await Invoice.findOne({ shipment: shipment._id }).sort({ createdAt: -1 })
      : null;

    const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const invoicePdfUrl = invoice?.pdfToken
      ? `${BASE_URL}/api/invoices/pdf/${invoice.pdfToken}`
      : null;

    const trxOr = [
      { transmissionId: tender.ediRef },
      { ediCode: '990', payload: { $regex: tender.tenderId } },
    ];
    if (shipment) trxOr.push({ shipment: shipment._id });
    const transmissions = await Transmission.find({ partner: tender.partner, $or: trxOr })
      .sort({ createdAt: 1 });

    res.json(buildEdiPipeline(tender, shipment, invoice, transmissions, invoicePdfUrl));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET one — full 204 detail for drawer
router.get('/:id', auth, async (req, res) => {
  try {
    const tender = await LoadTender.findById(req.params.id)
      .populate('partner', 'name isaId')
      .populate('assignedVehicle', 'vehicleId name type plate capacity');
    if (!tender) return res.status(404).json({ message: 'Tender not found' });
    res.json(tender);
  } catch { res.status(500).json({ message: 'Server error' }); }
});
// POST respond — send 990
router.post('/:id/respond', auth, async (req, res) => {
  try {
    const { status, vehicleId, notes } = req.body; // status: 'Accepted' | 'Rejected'
    const tender = await LoadTender.findById(req.params.id);
    if (!tender) return res.status(404).json({ message: 'Tender not found' });
    if (tender.status !== 'Pending') return res.status(400).json({ message: 'Already responded' });

    if (status === 'Accepted') {
      if (!vehicleId) {
        return res.status(400).json({ message: 'Vehicle is required to accept this load tender.' });
      }
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

      const capacityCheck = canVehicleCarryLoad(vehicle, tender.weight);
      if (!capacityCheck.ok) {
        return res.status(400).json({ message: capacityCheck.message });
      }

      if (!tender.pickupDate) {
        const fallback = getPickupAndDeliveryDates();
        tender.pickupDate = fallback.pickupDate;
      }

      // Compute estimatedDeliveryDate = pickupDate + 2 days
      const pickup = new Date(tender.pickupDate);
      const estDelivery = new Date(pickup);
      estDelivery.setDate(pickup.getDate() + 2);
      tender.estimatedDeliveryDate = estDelivery;
      tender.deliveryDate = estDelivery; // keep deliveryDate in sync

      tender.status = status;
      tender.assignedVehicle = vehicleId;

      await loadRateConfig();
      const pricing = calculateFreight(
        tender.route,
        vehicle.type,
        rateConfig.ratePerKm,
        rateConfig.minCharge,
      );
      tender.freightRate = pricing.amount || 0;
      if (pricing.error) {
        console.warn(`[990 pricing] ${pricing.error} — route: "${tender.route}"`);
      }

      const o = tender.originAddress || {};
      const existingShipment = await Shipment.findOne({ shipmentId: tender.shipmentId });
      if (!existingShipment || existingShipment.status === 'Delivered') {
        const shipmentId = existingShipment ? `${tender.shipmentId}-${Date.now()}` : tender.shipmentId;
        await new Shipment({
          shipmentId,
          orderId:                tender.orderId || tender.shipmentId,
          route:                 tender.route,
          origin:                o.city || '',
          partner:               tender.partner,
          vehicle:               vehicleId,
          tender:                tender._id,
          status:                'Pending',
          estimatedDeliveryDate: estDelivery,
        }).save();
      } else {
        existingShipment.vehicle = vehicleId;
        existingShipment.tender  = tender._id;
        existingShipment.estimatedDeliveryDate = estDelivery;
        if (!existingShipment.orderId) existingShipment.orderId = tender.orderId || tender.shipmentId;
        await existingShipment.save();
      }
    } else if (status === 'Rejected') {
      tender.status = status;
      if (notes) tender.rejectNotes = notes;
    } else {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await tender.save();

    // Log outbound 990
    const trx990 = await nextSequentialId(Transmission, 'transmissionId', 'TRX');
    await new Transmission({
      transmissionId: trx990,
      ediCode:   '990',
      label:     'LT Response',
      direction: 'OUT',
      partner:   tender.partner,
      status:    'Sent',
      isaSegment: `ISA*00*...*ZZ*CARGO*${new Date().toISOString().slice(0,10).replace(/-/g,'')}*^*00501*${trx990.replace('TRX-', '').padStart(9, '0')}*0*P*>`,
      payload:   JSON.stringify({ tenderRef: tender.tenderId, response: status, ...(notes ? { notes } : {}) }),
    }).save();

    // POST 990 acknowledgement to partner's system
    const partner = await require('../models/Partner').findById(tender.partner);
    const partnerName = partner?.name?.toLowerCase().trim();
    const vehicle990 = status === 'Accepted' ? await require('../models/Vehicle').findById(vehicleId) : null;

    const edi990Payload = {
      orderId:    tender.orderId || tender.shipmentId,
      shipmentId: tender.shipmentId,
      status:     status.toUpperCase(),
      ...(status === 'Accepted' ? {
        estimatedDeliveryDate: tender.estimatedDeliveryDate
          ? new Date(tender.estimatedDeliveryDate).toISOString().slice(0, 10)
          : null,
        totalAmount: tender.freightRate || 0,
      } : {}),
      ...(status === 'Accepted' && vehicle990 ? {
        assignedVehicle: {
          vehicleId: vehicle990.vehicleId || '',
          name:      vehicle990.name      || '',
          type:      vehicle990.type      || '',
          plate:     vehicle990.plate     || '',
        },
      } : {}),
      ...(notes ? { notes } : {}),
    };

    if (partnerName === 'surplus') {
      try {
        await fetch(process.env.EDI_SURPLUS_990, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edi990Payload),
        });
      } catch (e) { console.error('990 Surplus failed:', e.message); }
    }

    if (partnerName === 'hiraya') {
      try {
        await fetch(process.env.EDI_HIRAYA_990, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edi990Payload),
        });
      } catch (e) { console.error('990 Hiraya failed:', e.message); }
    }

    if (partnerName === 'bulldog exchange') {
      try {
        await fetch(process.env.EDI_BULLDOG_990, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edi990Payload),
        });
        console.log(`990 Bulldog ${status}`);
      } catch (e) { console.error('990 Bulldog failed:', e.message); }
    }

    if (partnerName === 'newforge') {
      try {
        await fetch(process.env.EDI_NEWFORGE_990, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edi990Payload),
        });
        console.log(`990 Newforge ${status}`);
      } catch (e) { console.error('990 Newforge failed:', e.message); }
    }

    // Any other partner with endpoints.edi990 configured
    if (partner?.endpoints?.edi990 &&
        !['surplus', 'hiraya', 'bulldog exchange', 'newforge'].includes(partnerName)) {
      try {
        await fetch(partner.endpoints.edi990, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edi990Payload),
        });
      } catch (e) { console.error('990 dynamic failed:', e.message); }
    }

    res.json(await tender.populate(['partner', 'assignedVehicle']));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
