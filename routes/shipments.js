const express = require('express');
const Shipment = require('../models/Shipment');
const Transmission = require('../models/Transmission');
const LoadTender = require('../models/LoadTender');
const auth = require('../middleware/auth');
const { nextSequentialId } = require('../utils/ids');
const router = express.Router();

const EDI_214_STATUSES = ['Pickup', 'In Transit', 'Delivered'];

const STATUS_MAP = {
  'Pickup':     'PICKUP',
  'In Transit': 'IN_TRANSIT',
  'Delivered':  'DELIVERED',
};

const DESCRIPTION_MAP = {
  'Pickup':     'Cargo has been picked up from the origin.',
  'In Transit': 'Cargo departed the central warehouse terminal.',
  'Delivered':  'Cargo has been delivered to the destination.',
};

// GET all
router.get('/', auth, async (req, res) => {
  try {
    res.json(await Shipment.find()
      .populate('partner', 'name')
      .populate('vehicle', 'vehicleId name type plate')
      .sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// PATCH update transactionId
router.patch('/:id/transaction', auth, async (req, res) => {
  try {
    const { transactionId } = req.body;
    const shipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      { transactionId },
      { new: true }
    ).populate('partner', 'name').populate('vehicle', 'vehicleId name type plate');
    if (!shipment) return res.status(404).json({ message: 'Shipment not found' });
    res.json(shipment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
      const trxId = await nextSequentialId(Transmission, 'transmissionId', 'TRX');
      await new Transmission({
        transmissionId: trxId,
        ediCode:   '214',
        label:     `Ship Status — ${status}`,
        direction: 'OUT',
        partner:   shipment.partner,
        shipment:  shipment._id,
        status:    'Sent',
        isaSegment: `ISA*00*...*ZZ*CARGO*${new Date().toISOString().slice(0,10).replace(/-/g,'')}*^*00501*${trxId.replace('TRX-', '').padStart(9,'0')}*0*P*>`,
        payload:   JSON.stringify({ shipmentId: shipment.shipmentId, status }),
      }).save();

      // Get destination city from tender's route (e.g. "Manila - Calamba" → "Calamba")
      let location = '';
      if (shipment.tender) {
        const tender = await LoadTender.findById(shipment.tender);
        if (tender && tender.route) {
          const parts = tender.route.split('-');
          location = parts.length > 1 ? parts[parts.length - 1].trim() : tender.route.trim();
        }
      }
      if (!location && shipment.route) {
        const parts = shipment.route.split('-');
        location = parts.length > 1 ? parts[parts.length - 1].trim() : shipment.route.trim();
      }

      // POST 214 to partner's system
      const Partner = require('../models/Partner');
      const partner = await Partner.findById(shipment.partner);
      const partnerName = partner?.name?.toLowerCase().trim();

      const payload214 = {
        shipmentId:  shipment.shipmentId,
        status:      STATUS_MAP[status] || status.toUpperCase().replace(/ /g, '_'),
        location,
        description: DESCRIPTION_MAP[status] || '',
      };

      const WEBHOOK_214 = {
        'surplus': [
          'https://patchy-rework-silver.ngrok-free.dev/api/edi/logistics/receive-214',
          'https://landlady-snap-booting.ngrok-free.dev/api/edi/vendor/receive-214',
        ],
        'hiraya': [
          'https://wildcard-squeegee-plunder.ngrok-free.dev/api/edi/214',
        ],
      };

      const webhookUrls = WEBHOOK_214[partnerName] || [];
      for (const webhookUrl of webhookUrls) {
        try {
          console.log(`214 POST to ${webhookUrl}:`, payload214);
          const r214 = await fetch(webhookUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload214),
          });
          console.log(`214 POST response from ${webhookUrl}: ${r214.status}`);
        } catch (err214) {
          console.error(`214 POST to ${webhookUrl} failed:`, err214.message);
        }
      }
    }

    await shipment.save();
    res.json(await shipment.populate(['partner', 'vehicle']));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
