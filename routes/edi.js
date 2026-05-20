const express = require('express');
const Shipment = require('../models/Shipment');
const Transmission = require('../models/Transmission');
const { nextSequentialId } = require('../utils/ids');
const router = express.Router();

// POST /api/edi/logistics/receive-990
// Inbound 990 from partner — acknowledgment after we accepted their load tender
router.post('/logistics/receive-990', async (req, res) => {
  try {
    const { shipmentId, status, transactionId } = req.body;

    if (!shipmentId || !status) {
      return res.status(400).json({ message: 'shipmentId and status are required' });
    }

    const shipment = await Shipment.findOne({ shipmentId });
    if (!shipment) {
      return res.status(404).json({ message: `Shipment ${shipmentId} not found` });
    }

    // Update shipment
    shipment.status = status;
    if (transactionId) shipment.transactionId = transactionId;
    await shipment.save();

    // Log inbound 990 transmission
    const trxId = await nextSequentialId(Transmission, 'transmissionId', 'TRX');
    await new Transmission({
      transmissionId: trxId,
      ediCode:   '990',
      label:     'LT Response (Inbound)',
      direction: 'IN',
      partner:   shipment.partner,
      shipment:  shipment._id,
      status:    'Received',
      isaSegment: `ISA*00*...*ZZ*PARTNER*${new Date().toISOString().slice(0,10).replace(/-/g,'')}*^*00501*${trxId.replace('TRX-', '').padStart(9, '0')}*0*P*>`,
      payload:   JSON.stringify({ shipmentId, status, transactionId }),
    }).save();

    res.json({
      message: 'Shipment updated',
      shipmentId: shipment.shipmentId,
      status: shipment.status,
      transactionId: shipment.transactionId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
