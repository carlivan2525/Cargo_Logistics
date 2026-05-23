const express = require('express');
const PDFDocument = require('pdfkit');
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
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceId}.pdf"`);
  doc.pipe(res);

  const fmt = n => `PHP ${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  doc.fontSize(22).font('Helvetica-Bold').text('CarGO Logistics Services', 50, 50);
  doc.fontSize(10).font('Helvetica').fillColor('#666').text('Freight Invoice', 50, 78);

  doc.fillColor('#000')
     .fontSize(10).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' })
     .font('Helvetica').fontSize(9)
     .text(`No: ${invoice.invoiceId}`, 400, 65, { align: 'right' })
     .text(`Date: ${fmtDate(invoice.createdAt)}`, 400, 78, { align: 'right' })
     .text(`Due: ${fmtDate(invoice.dueDate)}`, 400, 91, { align: 'right' });

  doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#ddd').stroke();

  doc.fillColor('#000').fontSize(9).font('Helvetica-Bold').text('BILL TO', 50, 130);
  doc.font('Helvetica').fontSize(10).text(invoice.partner?.name || '—', 50, 145);

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#666').text('SHIPMENT DETAILS', 300, 130);
  doc.font('Helvetica').fontSize(10).fillColor('#000')
     .text(`Shipment ID: ${invoice.shipment?.shipmentId || '—'}`, 300, 145)
     .text(`Route: ${invoice.shipment?.route || '—'}`, 300, 160);

  const tableTop = 210;
  doc.rect(50, tableTop, 495, 22).fill('#1a1a2e');
  doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
     .text('Description', 60, tableTop + 7)
     .text('Amount', 480, tableTop + 7, { align: 'right', width: 55 });

  const rowY = tableTop + 30;
  doc.fillColor('#000').font('Helvetica').fontSize(10)
     .text(`Freight charges — ${invoice.shipment?.route || 'Shipment'}`, 60, rowY)
     .text(fmt(invoice.amount), 480, rowY, { align: 'right', width: 55 });

  if (invoice.taxAmount > 0) {
    doc.text('Tax', 60, rowY + 20)
       .text(fmt(invoice.taxAmount), 480, rowY + 20, { align: 'right', width: 55 });
  }

  const totalY = rowY + (invoice.taxAmount > 0 ? 55 : 35);
  doc.moveTo(50, totalY).lineTo(545, totalY).strokeColor('#ddd').stroke();
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#000')
     .text('TOTAL', 60, totalY + 10)
     .text(fmt((invoice.amount || 0) + (invoice.taxAmount || 0)), 480, totalY + 10, { align: 'right', width: 55 });

  const statusY = totalY + 50;
  doc.rect(50, statusY, 80, 22).fill(invoice.status === 'Paid' ? '#16a34a' : '#ca8a04');
  doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold')
     .text(invoice.status.toUpperCase(), 50, statusY + 6, { width: 80, align: 'center' });

  doc.fillColor('#999').fontSize(8).font('Helvetica')
     .text('Thank you for your business. For inquiries, contact CarGO Logistics Services.', 50, 720, { align: 'center', width: 495 });

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
      .populate('shipment', 'shipmentId route');
    if (!invoice) return res.status(404).send('Invoice not found');
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
      .populate('shipment', 'shipmentId route');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
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
    const { invoiceNumber, shipmentId } = req.body;

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
        'hiraya':           'https://wildcard-squeegee-plunder.ngrok-free.dev/api/edi/freight-invoice/receipt',
        'bulldog exchange': 'https://landlady-snap-booting.ngrok-free.dev/api/edi/logistics/receive-receipt',
        'newforge':         'https://gilled-operable-jingle.ngrok-free.dev/api/edi/receive-997',
      };

      const endpoint = partner?.endpoints?.edi210 || RECEIPT_WEBHOOKS[partnerName] || partner?.apiEndpoint;
      if (endpoint) {
        const payload = {
          shipmentId: invoice.shipment.shipmentId,
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
