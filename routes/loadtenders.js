const express = require('express');
const LoadTender = require('../models/LoadTender');
const Partner = require('../models/Partner');
const Transmission = require('../models/Transmission');
const Shipment = require('../models/Shipment');
const Vehicle = require('../models/Vehicle');
const auth = require('../middleware/auth');
const { getPickupAndDeliveryDates, parseDateInput } = require('../utils/dates');
const { canVehicleCarryLoad } = require('../utils/capacity');
const { normalizeCustomer204, buildRoute } = require('../utils/normalize204');
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
    const deliveryDate = parseDateInput(rawDelivery);
    if (!pickupDate) return res.status(400).json({ message: 'pickupDate is required (customer schedule)' });
    if (!deliveryDate) return res.status(400).json({ message: 'deliveryDate or estimatedDeliveryDate is required' });

    const partner = await Partner.findOne({ isaId: isaId.toUpperCase() });
    if (!partner) {
      return res.status(400).json({ message: `Partner not found for isaId: ${isaId}` });
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
      deliveryDate,
      originAddress,
      weight: weight || '',
      commodity: commodity || '',
      status: 'Pending',
      rawEdi: rawEdi || null,
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

// GET one — full 204 detail for modal
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
    const { status, vehicleId } = req.body; // status: 'Accepted' | 'Rejected'
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

      if (!tender.pickupDate || !tender.deliveryDate) {
        const fallback = getPickupAndDeliveryDates();
        if (!tender.pickupDate) tender.pickupDate = fallback.pickupDate;
        if (!tender.deliveryDate) tender.deliveryDate = fallback.deliveryDate;
      }
      tender.status = status;
      tender.assignedVehicle = vehicleId;

      const o = tender.originAddress || {};
      const existingShipment = await Shipment.findOne({ shipmentId: tender.shipmentId });
      if (!existingShipment) {
        await new Shipment({
          shipmentId:  tender.shipmentId,
          route:       tender.route,
          origin:      o.city || '',
          partner:     tender.partner,
          vehicle:     vehicleId,
          tender:      tender._id,
          status:      'Pending',
        }).save();
      } else {
        existingShipment.vehicle = vehicleId;
        existingShipment.tender  = tender._id;
        await existingShipment.save();
      }
    } else if (status === 'Rejected') {
      tender.status = status;
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
      payload:   JSON.stringify({ tenderRef: tender.tenderId, response: status }),
    }).save();

    // POST 990 acknowledgement to partner's system
    if (status === 'Accepted') {
      const partner = await require('../models/Partner').findById(tender.partner);
      const partnerName = partner?.name?.toLowerCase();

      if (partnerName === 'surplus') {
        try {
          await fetch('https://patchy-rework-silver.ngrok-free.dev/api/edi/logistics/receive-990', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              shipmentId: tender.shipmentId,
              status:     'ACCEPTED',
            }),
          });
        } catch (e) { console.error('990 Surplus failed:', e.message); }
      }

      if (partnerName === 'hiraya') {
        try {
          const vehicle = await require('../models/Vehicle').findById(vehicleId);
          await fetch('https://wildcard-squeegee-plunder.ngrok-free.dev/api/edi/cargo/webhook', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              orderId:         tender.orderId || '',
              shipmentId:      tender.shipmentId || '',
              status:          'ACCEPTED',
              assignedVehicle: vehicle?.plate || vehicle?.name || '',
            }),
          });
        } catch (e) { console.error('990 Hiraya failed:', e.message); }
      }
    }

    res.json(await tender.populate(['partner', 'assignedVehicle']));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
