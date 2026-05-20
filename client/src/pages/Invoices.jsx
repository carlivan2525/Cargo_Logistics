import { useState, useEffect } from 'react';
import { FileText, Search, AlertTriangle, CheckCircle2, Clock, Send, Plus, X } from 'lucide-react';
import { api } from '../api';

const STATUS_STYLE = {
  'Paid':    'bg-green-500/20 text-green-400',
  'Pending': 'bg-yellow-500/20 text-yellow-400',
  'Overdue': 'bg-red-500/20 text-red-400',
  'Draft':   'bg-gray-500/20 text-gray-400',
};

function CreateInvoiceModal({ onClose, onCreated }) {
  const [shipments, setShipments] = useState([]);
  const [form, setForm] = useState({ shipment: '', amount: '', taxAmount: '', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/shipments').then(setShipments).catch(console.error);
  }, []);

  const selectedShipment = shipments.find(s => s._id === form.shipment);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shipment || !form.amount || !form.dueDate) return setError('Shipment, amount, and due date are required.');
    setSaving(true);
    setError('');
    try {
      await api.post('/invoices', {
        partner:   selectedShipment.partner._id,
        shipment:  form.shipment,
        amount:    Number(form.amount),
        taxAmount: Number(form.taxAmount || 0),
        dueDate:   form.dueDate,
        status:    'Pending',
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-app rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-app">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-blue-400" />
            <span className="font-semibold text-sm text-app">Create Invoice</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide">Shipment</label>
            <select
              value={form.shipment}
              onChange={e => setForm(f => ({ ...f, shipment: e.target.value }))}
              className="mt-1 w-full bg-white border border-app text-xs text-gray-900 rounded-lg px-3 py-2 outline-none cursor-pointer"
            >
              <option value="">Select shipment...</option>
              {shipments.map(s => (
                <option key={s._id} value={s._id}>{s.shipmentId} — {s.route} ({s.partner?.name})</option>
              ))}
            </select>
          </div>
          {selectedShipment && (
            <div className="text-xs text-gray-500 bg-input rounded-lg px-3 py-2">
              Partner: <span className="text-gray-300">{selectedShipment.partner?.name}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide">Total Amount (₱)</label>
              <input
                type="number" min="0" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="15000"
                className="mt-1 w-full bg-input border border-app text-xs text-gray-300 rounded-lg px-3 py-2 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide">Tax Amount (₱)</label>
              <input
                type="number" min="0" value={form.taxAmount}
                onChange={e => setForm(f => ({ ...f, taxAmount: e.target.value }))}
                placeholder="1800"
                className="mt-1 w-full bg-input border border-app text-xs text-gray-300 rounded-lg px-3 py-2 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide">Due Date</label>
            <input
              type="date" value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="mt-1 w-full bg-input border border-app text-xs text-gray-300 rounded-lg px-3 py-2 outline-none cursor-pointer"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="text-xs px-4 py-2 rounded-lg bg-hover border border-app text-gray-400 hover:opacity-80 transition cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer border-none disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = () =>
    api.get('/invoices')
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const send210 = async (id) => {
    try {
      const updated = await api.post(`/invoices/${id}/send210`, {});
      setInvoices(prev => prev.map(i => i._id === id ? updated : i));
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = invoices.filter(inv => {
    const matchSearch =
      inv.invoiceId?.toLowerCase().includes(search.toLowerCase()) ||
      inv.partner?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const overdue = invoices.filter(i => i.status === 'Overdue').length;
  const pending = invoices.filter(i => i.status === 'Pending').length;
  const paid    = invoices.filter(i => i.status === 'Paid').length;

  const fmtAmt  = n => `₱${Number(n).toLocaleString('en-PH')}`;
  const fmtDate = d =>
    d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (loading) return <div className="text-gray-500 text-sm py-10 text-center">Loading...</div>;

  return (
    <div className="space-y-4">
      {showCreate && <CreateInvoiceModal onClose={() => setShowCreate(false)} onCreated={load} />}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Overdue', value: overdue, icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Pending', value: pending, icon: Clock,         color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Paid',    value: paid,    icon: CheckCircle2,  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl p-4 border ${bg} flex items-center gap-3`}>
            <Icon size={18} className={color} />
            <div>
              <p className="text-2xl font-bold text-app">{value}</p>
              <p className="text-xs text-gray-400">{label} invoices</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-app overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-app">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-gray-400" />
            <span className="font-semibold text-sm text-app">Invoices</span>
            {overdue > 0 && (
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{overdue} overdue</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-input border border-app rounded-lg px-3 py-1.5">
              <Search size={12} className="text-gray-500" />
              <input type="text" placeholder="Search invoices..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-36" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-input border border-app text-xs text-gray-300 rounded-lg px-2 py-1.5 outline-none cursor-pointer">
              <option value="All">All Status</option>
              {['Paid', 'Pending', 'Overdue', 'Draft'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer border-none">
              <Plus size={12} /> New Invoice
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-app">
                <th className="text-left px-5 py-2.5 font-medium">Invoice ID</th>
                <th className="text-left px-5 py-2.5 font-medium">Partner</th>
                <th className="text-left px-5 py-2.5 font-medium">Shipment</th>
                <th className="text-left px-5 py-2.5 font-medium">Amount</th>
                <th className="text-left px-5 py-2.5 font-medium">Due Date</th>
                <th className="text-left px-5 py-2.5 font-medium">EDI 210</th>
                <th className="text-left px-5 py-2.5 font-medium">Status</th>
                <th className="text-right px-5 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv._id} className="border-b border-subtle hover:bg-hover transition">
                  <td className="px-5 py-3 font-mono text-xs text-gray-400">{inv.invoiceId}</td>
                  <td className="px-5 py-3 text-sm text-app font-medium">{inv.partner?.name}</td>
                  <td className="px-5 py-3 text-xs text-gray-400 font-mono">{inv.shipment?.shipmentId}</td>
                  <td className="px-5 py-3 text-xs text-app font-semibold">{fmtAmt(inv.amount)}</td>
                  <td className={`px-5 py-3 text-xs ${inv.status === 'Overdue' ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
                    {fmtDate(inv.dueDate)}
                  </td>
                  <td className="px-5 py-3">
                    {inv.ediSent
                      ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">EDI 210 Sent</span>
                      : <span className="text-xs text-gray-600">Not sent</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[inv.status]}`}>{inv.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {!inv.ediSent && (
                      <button onClick={() => send210(inv._id)}
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition cursor-pointer bg-transparent border-none ml-auto">
                        <Send size={11} /> Send 210
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-600 text-sm">No invoices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Invoices;
