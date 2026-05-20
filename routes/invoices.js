const express = require('express');
const Invoice = require('../models/Invoice');
const Transmission = require('../models/Transmission');
const auth = require('../middleware/auth');
const { nextSequentialId } = require('../utils/ids');
const router = express.Router();

const WEBHOOK_210 = 'https://patchy-rework-silver.ngrok-free.dev/api/edi/logistics/receive-210';

// GET all
router.get('/', auth, async (req, res) => {
  try {
    res.json(await Invoice.find()
      .populate('partner', 'name')
      .populate('shipment', 'shipmentId route')
      .sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// POST create invoice
router.post('/', auth, async (req, res) => {
  try {
    const count = await Invoice.countDocuments();
    const invoice = new Invoice({
      invoiceId: `INV-2026-${String(count + 1).padStart(4, '0')}`,
      ...req.body,
    });
    await invoice.save();
    res.status(201).json(await invoice.populate(['partner', 'shipment']));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST send EDI 210
router.post('/:id/send210', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('partner', 'name')
      .populate('shipment', 'shipmentId route');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const trxId = await nextSequentialId(Transmission, 'transmissionId', 'TRX');
    await new Transmission({
      transmissionId: trxId,
      ediCode:   '210',
      label:     'Invoice',
      direction: 'OUT',
      partner:   invoice.partner._id,
      shipment:  invoice.shipment._id,
      status:    'Sent',
      isaSegment: `ISA*00*...*ZZ*CARGO*${new Date().toISOString().slice(0,10).replace(/-/g,'')}*^*00501*${trxId.replace('TRX-', '').padStart(9,'0')}*0*P*>`,
      payload:   JSON.stringify({ invoiceId: invoice.invoiceId, amount: invoice.amount }),
    }).save();

    invoice.ediSent = true;
    await invoice.save();

    // POST 210 to partner's API
    try {
      const payload = {
        shipmentId:    invoice.shipment.shipmentId,
        invoiceNumber: invoice.invoiceId,
        totalAmount:   invoice.amount,
        taxAmount:     invoice.taxAmount || 0,
      };
      console.log('210 POST payload:', payload);
      const response = await fetch(WEBHOOK_210, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      console.log('210 POST response:', response.status);
    } catch (webhookErr) {
      console.error('210 POST failed:', webhookErr.message);
    }

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update status
router.put('/:id', auth, async (req, res) => {
  try {
    res.json(await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate(['partner', 'shipment']));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
