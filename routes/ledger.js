const express = require('express');
const Ledger  = require('../models/Ledger');
const auth    = require('../middleware/auth');
const router  = express.Router();

// GET all entries + current balance
router.get('/', auth, async (req, res) => {
  try {
    const entries = await Ledger.find()
      .populate('invoice', 'invoiceId amount')
      .populate('partner', 'name')
      .sort({ createdAt: -1 });
    const last = await Ledger.findOne().sort({ createdAt: -1 });
    res.json({ balance: last?.balance ?? 0, entries });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// POST withdrawal
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const last = await Ledger.findOne().sort({ createdAt: -1 });
    const currentBalance = last?.balance ?? 0;
    if (amount > currentBalance) return res.status(400).json({ message: 'Insufficient balance' });

    const entry = await Ledger.create({
      type:        'withdrawal',
      amount,
      description: 'Manual withdrawal',
      balance:     currentBalance - amount,
    });
    res.json(entry);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
