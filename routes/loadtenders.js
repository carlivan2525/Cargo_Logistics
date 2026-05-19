const express = require('express');
const LoadTender = require('../models/LoadTender');
const Partner = require('../models/Partner');
const Transmission = require('../models/Transmission');
const Shipment = require('../models/Shipment');
const Vehicle = require('../models/Vehicle');
const auth = require('../middleware/auth');
const { getPickupAndDeliveryDates } = require('../utils/dates');
const { canVehicleCarryLoad } = require('../utils/capacity');
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

// POST create (simulate receiving a 204)
router.post('/', auth, async (req, res) => {
  try {
    const count = await LoadTender.countDocuments();
    const tCount = await Transmission.countDocuments();

    const { route, weight, commodity, isaId, shipmentId: bodyShipmentId } = req.body;

    if (!isaId) return res.status(400).json({ message: 'isaId is required (e.g. SURPLUS)' });
    if (!route) return res.status(400).json({ message: 'route is required' });

    const partner = await Partner.findOne({ isaId: isaId.toUpperCase() });
    if (!partner) {
      return res.status(400).json({ message: `Partner not found for isaId: ${isaId}` });
    }

    const tender = new LoadTender({
      tenderId: `TND-${String(count + 1).padStart(4, '0')}`,
      ediRef:   `TRX-${String(tCount + 1).padStart(4, '0')}`,
      partner: partner._id,
      shipmentId: bodyShipmentId || `SHP-${Date.now()}`,
      route,
      weight: weight || '',
      commodity: commodity || '',
    });
    await tender.save();

    // Log the inbound 204 transmission
    await new Transmission({
      transmissionId: `TRX-${String(tCount + 1).padStart(4, '0')}`,
      ediCode:   '204',
      label:     'Load Tender',
      direction: 'IN',
      partner:   tender.partner,
      status:    'Received',
      isaSegment: `ISA*00*...*ZZ*${partner.isaId}*${new Date().toISOString().slice(0,10).replace(/-/g,'')}*^*00501*${String(tCount+1).padStart(9,'0')}*0*P*>`,
    }).save();

    res.status(201).json(await tender.populate('partner', 'name isaId'));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
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

      const { pickupDate, deliveryDate } = getPickupAndDeliveryDates();
      tender.pickupDate = pickupDate;
      tender.deliveryDate = deliveryDate;
      tender.status = status;
      tender.assignedVehicle = vehicleId;
      await Vehicle.findByIdAndUpdate(vehicleId, { status: 'In Use' });

      const routeParts = tender.route.split(/\s*[-→]\s*/);
      await new Shipment({
        shipmentId:  tender.shipmentId,
        route:       tender.route,
        origin:      routeParts[0]?.trim(),
        destination: routeParts[1]?.trim(),
        partner:     tender.partner,
        vehicle:     vehicleId,
        tender:      tender._id,
        status:      'Pending',
      }).save();
    } else if (status === 'Rejected') {
      tender.status = status;
    } else {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await tender.save();

    // Log outbound 990
    const tCount = await Transmission.countDocuments();
    await new Transmission({
      transmissionId: `TRX-${String(tCount + 1).padStart(4, '0')}`,
      ediCode:   '990',
      label:     'LT Response',
      direction: 'OUT',
      partner:   tender.partner,
      status:    'Sent',
      isaSegment: `ISA*00*...*ZZ*CARGO*${new Date().toISOString().slice(0,10).replace(/-/g,'')}*^*00501*${String(tCount+1).padStart(9,'0')}*0*P*>`,
      payload:   JSON.stringify({ tenderRef: tender.tenderId, response: status }),
    }).save();

    res.json(await tender.populate(['partner', 'assignedVehicle']));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
