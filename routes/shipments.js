const express = require('express');
const Shipment = require('../models/Shipment');
const Transmission = require('../models/Transmission');
const auth = require('../middleware/auth');
const router = express.Router();

const EDI_214_STATUSES = ['Pickup', 'In Transit', 'Delivered'];

// GET all
router.get('/', auth, async (req, res) => {
  try {
    res.json(await Shipment.find()
      .populate('partner', 'name')
      .populate('vehicle', 'vehicleId name type plate')
      .sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// PUT update status — auto-sends 214
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });

    shipment.status = status;

    if (EDI_214_STATUSES.includes(status)) {
      shipment.edi214Sent = true;
      const tCount = await Transmission.countDocuments();
      await new Transmission({
        transmissionId: `TRX-${String(tCount + 1).padStart(4, '0')}`,
        ediCode:   '214',
        label:     `Ship Status — ${status}`,
        direction: 'OUT',
        partner:   shipment.partner,
        shipment:  shipment._id,
        status:    'Sent',
        isaSegment: `ISA*00*...*ZZ*CARGO*${new Date().toISOString().slice(0,10).replace(/-/g,'')}*^*00501*${String(tCount+1).padStart(9,'0')}*0*P*>`,
        payload:   JSON.stringify({ shipmentId: shipment.shipmentId, status }),
      }).save();
    }

    await shipment.save();
    res.json(await shipment.populate(['partner', 'vehicle']));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
