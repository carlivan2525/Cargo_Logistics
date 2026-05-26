const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const Invoice = require('../models/Invoice');
const Transmission = require('../models/Transmission');
const Partner = require('../models/Partner');
const Ledger = require('../models/Ledger');
const auth = require('../middleware/auth');
const { nextSequentialId } = require('../utils/ids');
const router = express.Router();

// ─── helpers ────────────────────────────────────────────────────────────────

function buildPdf(invoice, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceId}.pdf"`);
  doc.pipe(res);

  const fmt     = n  => `PHP ${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const fmtDate = d  => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const dash    = v  => (v && String(v).trim()) ? v : '—';

  const tender  = invoice.tender || {};
  const origin  = tender.originAddress || {};
  const vehicle = tender.assignedVehicle || {};

  // ── Header ──────────────────────────────────────────────────────────────
  // Logo
  const logoPath = path.join(__dirname, '../client/public/CarGO-logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 40, { width: 48 });
  }
  doc.fontSize(20).font('Helvetica-Bold').text('CarGO Logistics Services', 108, 45);
  doc.fontSize(10).font('Helvetica').fillColor('#666').text('Official Freight Invoice', 108, 70);

  doc.fillColor('#000')
     .fontSize(10).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' })
     .font('Helvetica').fontSize(9)
     .text(`No: ${invoice.invoiceId}`,          400, 65,  { align: 'right' })
     .text(`Date: ${fmtDate(invoice.createdAt)}`, 400, 78,  { align: 'right' })
     .text(`Due:  ${fmtDate(invoice.dueDate)}`,   400, 91,  { align: 'right' });

  doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#ddd').stroke();

  // ── Bill To ─────────────────────────────────────────────────────────────
  let y = 130;
  doc.fillColor('#000').fontSize(9).font('Helvetica-Bold').text('BILL TO', 50, y);
  doc.font('Helvetica').fontSize(10).text(dash(invoice.partner?.name), 50, y + 14);

  // ── Shipment / Tender Info ───────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#666').text('SHIPMENT DETAILS', 300, y);
  doc.font('Helvetica').fontSize(9).fillColor('#000')
     .text(`Shipment ID : ${dash(invoice.shipment?.shipmentId)}`, 300, y + 14)
     .text(`Route       : ${dash(invoice.shipment?.route)}`,      300, y + 26)
     .text(`Order ID    : ${dash(tender.orderId)}`,               300, y + 38)
     .text(`Tender ID   : ${dash(tender.tenderId)}`,              300, y + 50);

  y = 210;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#eee').stroke();
  y += 10;

  // ── Origin Address ───────────────────────────────────────────────────────
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#444').text('PICKUP / ORIGIN', 50, y);
  y += 13;
  doc.font('Helvetica').fontSize(9).fillColor('#000')
     .text(`Location  : ${dash(origin.locationName)}`, 50, y)
     .text(`City      : ${dash(origin.city)}${origin.region ? ', ' + origin.region : ''}`, 50, y + 12)
     .text(`ZIP       : ${dash(origin.zipCode)}`,      50, y + 24)
     .text(`Contact   : ${dash(origin.contactPerson)}`, 50, y + 36)
     .text(`Phone     : ${dash(origin.contactPhone)}`,  50, y + 48);

  // ── Schedule ─────────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#444').text('SCHEDULE', 300, y);
  y += 13;
  doc.font('Helvetica').fontSize(9).fillColor('#000')
     .text(`Pickup Date    : ${fmtDate(tender.pickupDate)}`,                           300, y)
     .text(`Delivery Date  : ${fmtDate(invoice.actualDeliveryDate || tender.deliveryDate)}`, 300, y + 12);

  y += 65;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#eee').stroke();
  y += 10;

  // ── Load Details ─────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#444').text('LOAD DETAILS', 50, y);
  y += 13;
  doc.font('Helvetica').fontSize(9).fillColor('#000')
     .text(`Commodity : ${dash(tender.commodity)}`, 50,  y)
     .text(`Weight    : ${dash(tender.weight)}`,    50,  y + 12)
     .text(`Carrier   : ${dash(tender.carrierName || tender.carrierId)}`, 50, y + 24)
     .text(`SCAC      : ${dash(tender.carrierScac)}`, 50, y + 36);

  // ── Assigned Vehicle ─────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#444').text('ASSIGNED VEHICLE', 300, y);
  y += 13;
  doc.font('Helvetica').fontSize(9).fillColor('#000')
     .text(`Vehicle   : ${dash(vehicle.name)}`,  300, y)
     .text(`Type      : ${dash(vehicle.type)}`,  300, y + 12)
     .text(`Plate     : ${dash(vehicle.plate)}`, 300, y + 24);

  y += 55;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#eee').stroke();
  y += 10;

  // ── Charges Table ────────────────────────────────────────────────────────
  doc.rect(50, y, 495, 22).fill('#1a1a2e');
  doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
     .text('Description', 60, y + 7)
     .text('Amount', 480, y + 7, { align: 'right', width: 55 });

  y += 30;
  doc.fillColor('#000').font('Helvetica').fontSize(10)
     .text(`Freight charges — ${invoice.shipment?.route || 'Shipment'}`, 60, y)
     .text(fmt(invoice.amount || 0), 480, y, { align: 'right', width: 55 });

  if (invoice.taxAmount > 0) {
    y += 20;
    doc.text('Tax', 60, y).text(fmt(invoice.taxAmount), 480, y, { align: 'right', width: 55 });
  }

  y += 35;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').stroke();
  y += 10;
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#000')
     .text('TOTAL', 60, y)
     .text(fmt((invoice.amount || 0) + (invoice.taxAmount || 0)), 480, y, { align: 'right', width: 55 });

  y += 40;
  doc.rect(50, y, 80, 22).fill(invoice.status === 'Paid' ? '#16a34a' : '#ca8a04');
  doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold')
     .text(invoice.status.toUpperCase(), 50, y + 6, { width: 80, align: 'center' });

  doc.fillColor('#999').fontSize(8).font('Helvetica')
     .text('Thank you for your business. For inquiries, contact CarGO Logistics Services.', 50, 760, { align: 'center', width: 495 });

  doc.end();
}

// ─── routes ─────────────────────────────────────────────────────────────────

// GET all
router.get('/', auth, async (req, res) => {
  try {
    res.json(await Invoice.find()
      .populate('partner', 'name')
      .populate('shipment', 'shipmentId route')
      .sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// GET public PDF via token (no auth — for partner access)
router.get('/pdf/:token', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ pdfToken: req.params.token })
      .populate('partner', 'name')
      .populate({ path: 'shipment', populate: { path: 'tender', populate: { path: 'assignedVehicle', select: 'name type plate' } } });
    if (!invoice) return res.status(404).send('Invoice not found');
    if (invoice.shipment?.tender) invoice.tender = invoice.shipment.tender;
    invoice.actualDeliveryDate = invoice.shipment?.deliveredAt || null;
    buildPdf(invoice, res);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// GET PDF (authenticated — for CarGO dashboard download)
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('partner', 'name')
      .populate({ path: 'shipment', populate: { path: 'tender', populate: { path: 'assignedVehicle', select: 'name type plate' } } });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.shipment?.tender) invoice.tender = invoice.shipment.tender;
    invoice.actualDeliveryDate = invoice.shipment?.deliveredAt || null;
    buildPdf(invoice, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create invoice (manual)
router.post('/', auth, async (req, res) => {
  try {
    const invoiceId = await nextSequentialId(Invoice, 'invoiceId', 'INV');
    const invoice = new Invoice({ invoiceId, ...req.body });
    await invoice.save();
    res.status(201).json(await invoice.populate(['partner', 'shipment']));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST webhook — partner notifies CarGO that invoice is paid
router.post('/webhook/paid', async (req, res) => {
  try {
    const { invoiceNumber, shipmentId, status } = req.body;

    let invoice = invoiceNumber
      ? await Invoice.findOne({ invoiceId: invoiceNumber }).populate('partner', 'name').populate('shipment', 'shipmentId')
      : null;

    // fallback: find by shipmentId
    if (!invoice && shipmentId) {
      const Shipment = require('../models/Shipment');
      const shipment = await Shipment.findOne({ shipmentId });
      if (shipment) invoice = await Invoice.findOne({ shipment: shipment._id }).populate('partner', 'name').populate('shipment', 'shipmentId');
    }

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    invoice.status = 'Paid';
    await invoice.save();

    // Credit ledger
    const lastEntry = await Ledger.findOne().sort({ createdAt: -1 });
    const currentBalance = lastEntry?.balance ?? 0;
    await Ledger.create({
      type:        'credit',
      amount:      invoice.amount,
      description: `Payment received — ${invoice.invoiceId}`,
      invoice:     invoice._id,
      partner:     invoice.partner._id,
      balance:     currentBalance + invoice.amount,
    });

    // Log EDI 820 — Payment Order / Remittance Advice
    const trx820 = await nextSequentialId(Transmission, 'transmissionId', 'TRX');
    await new Transmission({
      transmissionId: trx820,
      ediCode:   '820',
      label:     'Payment Remittance',
      direction: 'IN',
      partner:   invoice.partner._id,
      shipment:  invoice.shipment?._id,
      status:    'Received',
      isaSegment: `ISA*00*...*ZZ*${invoice.partner?.name?.toUpperCase() || 'PARTNER'}*${new Date().toISOString().slice(0,10).replace(/-/g,'')}*^*00501*${trx820.replace('TRX-', '').padStart(9,'0')}*0*P*>`,
      payload:   JSON.stringify({ invoiceId: invoice.invoiceId, amount: invoice.amount, paidVia: 'webhook' }),
    }).save();

    console.log(`Invoice ${invoice.invoiceId} marked Paid via webhook — EDI 820 logged`);
    res.json({ message: 'Marked as paid', invoiceId: invoice.invoiceId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST send EDI 210 — includes pdfUrl in payload
router.post('/:id/send210', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('partner', 'name')
      .populate('shipment', 'shipmentId route');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const pdfUrl = invoice.pdfToken
      ? `${BASE_URL}/api/invoices/pdf/${invoice.pdfToken}`
      : null;

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
      payload:   JSON.stringify({ invoiceId: invoice.invoiceId, amount: invoice.amount, pdfUrl }),
    }).save();

    // Log 997 acknowledgement transmission
    const trx997Id = await nextSequentialId(Transmission, 'transmissionId', 'TRX');
    await new Transmission({
      transmissionId: trx997Id,
      ediCode:   '997',
      label:     'Functional Acknowledgement',
      direction: 'OUT',
      partner:   invoice.partner._id,
      shipment:  invoice.shipment._id,
      status:    'Sent',
      isaSegment: `ISA*00*...*ZZ*CARGO*${new Date().toISOString().slice(0,10).replace(/-/g,'')}*^*00501*${trx997Id.replace('TRX-', '').padStart(9,'0')}*0*P*>`,
      payload:   JSON.stringify({ invoiceId: invoice.invoiceId, acknowledgedEdi: '210' }),
    }).save();

    invoice.ediSent    = true;
    invoice.edi997Sent = true;
    await invoice.save();

    // POST 997 to partner's API with pdfUrl
    try {
      const partner = await Partner.findById(invoice.partner._id);
      const partnerName = partner?.name?.toLowerCase().trim();

      const RECEIPT_WEBHOOKS = {
        'surplus':          process.env.EDI_SURPLUS_997,
        'hiraya':           process.env.EDI_HIRAYA_997,
        'bulldog exchange': process.env.EDI_BULLDOG_997,
        'newforge':         process.env.EDI_NEWFORGE_997,
      };

      const endpoint = partner?.endpoints?.edi997 || RECEIPT_WEBHOOKS[partnerName] || partner?.apiEndpoint;
      if (endpoint) {
        const payload = {
          shipmentId:  invoice.shipment.shipmentId,
          invoiceId:   invoice.invoiceId,
          totalAmount: invoice.amount,
          dueDate:     invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : null,
          status:      invoice.status,
          pdfUrl,
        };
        const response = await fetch(endpoint, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });
        console.log('997 POST response:', response.status);
      }
    } catch (webhookErr) {
      console.error('997 POST failed:', webhookErr.message);
    }

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT mark as paid (manual — CarGO confirms payment)
router.put('/:id/pay', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'Paid' },
      { new: true }
    ).populate('partner', 'name').populate('shipment', 'shipmentId route');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // Credit ledger
    const lastEntry = await Ledger.findOne().sort({ createdAt: -1 });
    const currentBalance = lastEntry?.balance ?? 0;
    await Ledger.create({
      type:        'credit',
      amount:      invoice.amount,
      description: `Payment received — ${invoice.invoiceId}`,
      invoice:     invoice._id,
      partner:     invoice.partner._id,
      balance:     currentBalance + invoice.amount,
    });

    // Log EDI 820 — Payment Order / Remittance Advice
    const trx820 = await nextSequentialId(Transmission, 'transmissionId', 'TRX');
    await new Transmission({
      transmissionId: trx820,
      ediCode:   '820',
      label:     'Payment Remittance',
      direction: 'IN',
      partner:   invoice.partner._id,
      shipment:  invoice.shipment?._id,
      status:    'Received',
      isaSegment: `ISA*00*...*ZZ*${invoice.partner?.name?.toUpperCase() || 'PARTNER'}*${new Date().toISOString().slice(0,10).replace(/-/g,'')}*^*00501*${trx820.replace('TRX-', '').padStart(9,'0')}*0*P*>`,
      payload:   JSON.stringify({ invoiceId: invoice.invoiceId, amount: invoice.amount, paidVia: 'manual' }),
    }).save();

    res.json(invoice);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// PUT update (generic)
router.put('/:id', auth, async (req, res) => {
  try {
    res.json(await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate(['partner', 'shipment']));
  } catch { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
