const express = require('express');
const LoadTender = require('../models/LoadTender');
const Transmission = require('../models/Transmission');
const Shipment = require('../models/Shipment');
const Vehicle = require('../models/Vehicle');
const auth = require('../middleware/auth');
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

    const tender = new LoadTender({
      tenderId: `TND-${String(count + 1).padStart(4, '0')}`,
      ediRef:   `TRX-${String(tCount + 1).padStart(4, '0')}`,
      ...req.body,
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
      isaSegment: `ISA*00*...*ZZ*${req.body.isaId ?? 'PARTNER'}*${new Date().toISOString().slice(0,10).replace(/-/g,'')}*^*00501*${String(tCount+1).padStart(9,'0')}*0*P*>`,
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

    tender.status = status;
    if (status === 'Accepted' && vehicleId) {
      tender.assignedVehicle = vehicleId;
      await Vehicle.findByIdAndUpdate(vehicleId, { status: 'In Use' });

      // Auto-create shipment on acceptance
      const sCount = await Shipment.countDocuments();
      await new Shipment({
        shipmentId:  tender.shipmentId,
        route:       tender.route,
        origin:      tender.route.split('→')[0]?.trim(),
        destination: tender.route.split('→')[1]?.trim(),
        partner:     tender.partner,
        vehicle:     vehicleId,
        tender:      tender._id,
        status:      'Pending',
      }).save();
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
