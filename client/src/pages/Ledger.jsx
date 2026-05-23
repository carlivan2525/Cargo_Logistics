import { useState } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, AlertCircle, FileText } from 'lucide-react';
import { api } from '../api';
import { usePolling } from '../hooks/usePolling';

function WithdrawModal({ balance, onConfirm, onCancel }) {
  const [amount, setAmount] = useState('');
  const [error, setError]   = useState('');

  const handleConfirm = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return setError('Enter a valid amount.');
    if (val > balance) return setError('Amount exceeds current balance.');
    onConfirm(val);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-card border border-app rounded-2xl w-full max-w-sm shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-app">
          <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
            <ArrowUpCircle size={18} className="text-orange-400" />
          </div>
          <div>
            <p className="font-semibold text-app text-sm">Withdraw funds</p>
            <p className="text-xs text-gray-500 mt-0.5">Available: ₱{balance.toLocaleString('en-PH')}</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Amount to withdraw</label>
            <div className="flex items-center gap-2 bg-input border border-app rounded-lg px-3 py-2">
              <span className="text-xs text-gray-500">₱</span>
              <input
                type="number"
                min="1"
                max={balance}
                value={amount}
                onChange={e => { setAmount(e.target.value); setError(''); }}
                placeholder="0.00"
                className="bg-transparent text-sm text-app outline-none flex-1"
                autoFocus
              />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle size={12} /> {error}
            </div>
          )}
          <p className="text-xs text-gray-500">
            Are you sure you want to withdraw <span className="text-app font-medium">₱{parseFloat(amount || 0).toLocaleString('en-PH')}</span>?
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-app">
          <button type="button" onClick={onCancel}
            className="text-xs px-4 py-2 rounded-lg bg-hover border border-app text-secondary-app hover:opacity-80 transition cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm}
            className="text-xs px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition cursor-pointer border-none">
            Confirm Withdrawal
          </button>
        </div>
      </div>
    </div>
  );
}

function Ledger() {
  const [balance, setBalance]     = useState(0);
  const [entries, setEntries]     = useState([]);
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () =>
    Promise.all([api.get('/ledger'), api.get('/invoices')])
      .then(([ledger, invs]) => {
        setBalance(ledger.balance);
        setEntries(ledger.entries);
        setInvoices(invs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

  usePolling(load);

  const totalBilled    = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const paidRevenue    = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0);
  const collectionRate = totalBilled > 0 ? Math.round((paidRevenue / totalBilled) * 100) : 0;
  const paidCount      = invoices.filter(i => i.status === 'Paid').length;

  const handleWithdraw = async (amount) => {
    try {
      await api.post('/ledger/withdraw', { amount });
      setShowModal(false);
      load();
    } catch (err) { alert(err.message); }
  };

  const fmt    = n => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
    new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) return <div className="text-gray-500 text-sm py-10 text-center">Loading...</div>;

  return (
    <>
      {showModal && <WithdrawModal balance={balance} onConfirm={handleWithdraw} onCancel={() => setShowModal(false)} />}

      <div className="space-y-4 flex flex-col h-full">

        {/* Invoice summary strip */}
        <div className="grid grid-cols-3 gap-4 shrink-0">
          <div className="bg-card rounded-xl border border-app p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <FileText size={12} /> Total Billed
            </div>
            <p className="text-xl font-bold text-app">{fmt(totalBilled)}</p>
            <p className="text-xs text-gray-500 mt-1">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-card rounded-xl border border-app p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <ArrowDownCircle size={12} /> Collected
            </div>
            <p className="text-xl font-bold text-green-400">{fmt(paidRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">{paidCount} paid</p>
          </div>
          <div className="bg-card rounded-xl border border-app p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <Wallet size={12} /> Collection Rate
            </div>
            <p className={`text-xl font-bold ${collectionRate >= 80 ? 'text-green-400' : collectionRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {collectionRate}%
            </p>
            <p className="text-xs text-gray-500 mt-1">paid vs total billed</p>
          </div>
        </div>

        {/* Balance card */}
        <div className="bg-card rounded-xl border border-app p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center">
              <Wallet size={22} className="text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Current Balance</p>
              <p className="text-3xl font-bold text-green-400 mt-0.5">{fmt(balance)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            disabled={balance <= 0}
            className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowUpCircle size={15} /> Withdraw
          </button>
        </div>

        {/* Ledger table */}
        <div className="bg-card rounded-xl border border-app flex flex-col" style={{ maxHeight: '65vh' }}>
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-app shrink-0">
            <Wallet size={14} className="text-gray-400" />
            <span className="font-semibold text-sm text-app">Transaction Ledger</span>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{entries.length} entries</span>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="text-gray-500 text-xs border-b border-app">
                  <th className="text-left px-5 py-2.5 font-medium">Date</th>
                  <th className="text-left px-5 py-2.5 font-medium">Type</th>
                  <th className="text-left px-5 py-2.5 font-medium">Description</th>
                  <th className="text-left px-5 py-2.5 font-medium">Partner</th>
                  <th className="text-right px-5 py-2.5 font-medium">Amount</th>
                  <th className="text-right px-5 py-2.5 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-600 text-sm">No transactions yet.</td></tr>
                )}
                {entries.map(e => (
                  <tr key={e._id} className="border-b border-subtle hover:bg-hover transition">
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(e.createdAt)}</td>
                    <td className="px-5 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-medium w-fit px-2 py-0.5 rounded-full
                        ${e.type === 'credit' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {e.type === 'credit'
                          ? <ArrowDownCircle size={10} />
                          : <ArrowUpCircle size={10} />}
                        {e.type === 'credit' ? 'Credit' : 'Withdrawal'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-300">{e.description}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{e.partner?.name ?? '—'}</td>
                    <td className={`px-5 py-3 text-xs font-semibold text-right ${e.type === 'credit' ? 'text-green-400' : 'text-orange-400'}`}>
                      {e.type === 'credit' ? '+' : '-'}{fmt(e.amount)}
                    </td>
                    <td className="px-5 py-3 text-xs text-app font-mono text-right">{fmt(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default Ledger;
