const express = require('express');
const crypto = require('crypto');
const Shipment = require('../models/Shipment');
const Transmission = require('../models/Transmission');
const LoadTender = require('../models/LoadTender');
const Invoice = require('../models/Invoice');
const Partner = require('../models/Partner');
const auth = require('../middleware/auth');
const { nextSequentialId } = require('../utils/ids');
const { calculateFreight } = require('../utils/pricing');
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

// PUT update status — auto-sends 214, auto-generates invoice on Delivered
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

      // Get destination city
      let location = '';
      if (shipment.tender) {
        const tender = await LoadTender.findById(shipment.tender);
        if (tender?.route) {
          const parts = tender.route.split('-');
          location = parts.length > 1 ? parts[parts.length - 1].trim() : tender.route.trim();
        }
      }
      if (!location && shipment.route) {
        const parts = shipment.route.split('-');
        location = parts.length > 1 ? parts[parts.length - 1].trim() : shipment.route.trim();
      }

      // POST 214 to partner's system
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
        ],
        'hiraya': [
          'https://wildcard-squeegee-plunder.ngrok-free.dev/api/edi/214',
        ],
        'bulldog exchange': [
          'https://landlady-snap-booting.ngrok-free.dev/api/edi/logistics/receive-214',
        ],
      };

      const dynamicUrl = partner?.endpoints?.edi214;
      console.log(`[214] partner: "${partnerName}" | dynamic edi214 url: "${dynamicUrl}"`);
      const webhookUrls = dynamicUrl ? [dynamicUrl] : (WEBHOOK_214[partnerName] || []);
      console.log(`[214] will POST to:`, webhookUrls);
      for (const webhookUrl of webhookUrls) {
        try {
          const r214 = await fetch(webhookUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload214),
          });
          console.log(`214 POST to ${webhookUrl}: ${r214.status}`);
        } catch (err214) {
          console.error(`214 POST to ${webhookUrl} failed:`, err214.message);
        }
      }
    }

    // Auto-generate freight invoice when Delivered
    if (status === 'Delivered') {
      const existing = await Invoice.findOne({ shipment: shipment._id });
      if (!existing) {
        // Get vehicle type
        let vehicleType = null;
        if (shipment.vehicle) {
          const Vehicle = require('../models/Vehicle');
          const vehicle = await Vehicle.findById(shipment.vehicle);
          vehicleType = vehicle?.type || null;
        }

        // Calculate amount based on distance + vehicle type
        let amount = 0;
        const shipmentRoute = (shipment.route || '').trim();
        if (shipmentRoute && vehicleType) {
          const pricing = calculateFreight(shipmentRoute, vehicleType);
          amount = pricing.amount || 0;
          if (pricing.error) {
            console.warn(`[pricing] ${pricing.error} — route: "${shipmentRoute}"`);
          } else {
            console.log(`[pricing] ${shipmentRoute} | ${vehicleType} | ${pricing.distanceKm}km | PHP ${amount}`);
          }
        }

        // Generate a public token for PDF access
        const pdfToken = crypto.randomBytes(32).toString('hex');

        const invoiceId = await nextSequentialId(Invoice, 'invoiceId', 'INV');
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        const invoice = await new Invoice({
          invoiceId,
          partner:  shipment.partner,
          shipment: shipment._id,
          amount,
          dueDate,
          status:   'Pending',
          pdfToken,
        }).save();

        // Log EDI 210 transmission
        const trx210Id = await nextSequentialId(Transmission, 'transmissionId', 'TRX');
        await new Transmission({
          transmissionId: trx210Id,
          ediCode:   '210',
          label:     'Invoice',
          direction: 'OUT',
          partner:   shipment.partner,
          shipment:  shipment._id,
          status:    'Sent',
          isaSegment: `ISA*00*...*ZZ*CARGO*${new Date().toISOString().slice(0,10).replace(/-/g,'')}*^*00501*${trx210Id.replace('TRX-', '').padStart(9,'0')}*0*P*>`,
          payload:   JSON.stringify({ invoiceId, amount }),
        }).save();

        // Auto-POST 210 to partner's endpoint
        const partner = await Partner.findById(shipment.partner);
        const partnerName = partner?.name?.toLowerCase().trim();
        const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
        const pdfUrl = `${BASE_URL}/api/invoices/pdf/${pdfToken}`;

        const INVOICE_WEBHOOKS = {
          'surplus':          'https://patchy-rework-silver.ngrok-free.dev/api/edi/logistics/receive-invoice',
          'hiraya':           'https://wildcard-squeegee-plunder.ngrok-free.dev/api/edi/receive/freight-invoice',
          'bulldog exchange': 'https://landlady-snap-booting.ngrok-free.dev/api/edi/logistics/receive-210',
        };

        const webhookUrl = partner?.endpoints?.invoice || INVOICE_WEBHOOKS[partnerName];
        if (webhookUrl) {
          try {
            await fetch(webhookUrl, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shipmentId:  shipment.shipmentId,
                invoiceId,
                totalAmount: amount,
                status:      'Pending',
                pdfUrl,
              }),
            });
            console.log(`210 auto-posted to ${partnerName}: ${invoiceId}`);
            await Invoice.findByIdAndUpdate(invoice._id, { ediSent: true });
          } catch (err) {
            console.error(`210 auto-post to ${partnerName} failed:`, err.message);
          }
        }

        console.log(`Invoice ${invoiceId} generated for ${shipment.shipmentId}`);
      }
    }

    // If reverting away from Delivered, delete the auto-generated invoice (if not yet paid)
    if (status !== 'Delivered') {
      const inv = await Invoice.findOne({ shipment: shipment._id, status: { $ne: 'Paid' } });
      if (inv) {
        await Invoice.deleteOne({ _id: inv._id });
        console.log(`Invoice ${inv.invoiceId} deleted — shipment reverted from Delivered`);
      }
    }

    await shipment.save();
    res.json(await shipment.populate(['partner', 'vehicle']));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
