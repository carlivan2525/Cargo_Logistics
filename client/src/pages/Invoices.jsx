import { useState } from 'react';
import { FileText, Search, AlertTriangle, CheckCircle2, Clock, Send, Download } from 'lucide-react';
import { api } from '../api';
import { usePolling } from '../hooks/usePolling';

const STATUS_STYLE = {
  'Paid':    'bg-green-500/20 text-green-400',
  'Pending': 'bg-yellow-500/20 text-yellow-400',
  'Overdue': 'bg-red-500/20 text-red-400',
  'Draft':   'bg-gray-500/20 text-gray-400',
};

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading]   = useState(true);

  const load = () =>
    api.get('/invoices')
      .then(data => setInvoices(data))
      .catch(console.error)
      .finally(() => setLoading(false));

  usePolling(load);

  const send210 = async (id) => {
    try {
      const updated = await api.post(`/invoices/${id}/send210`, {});
      setInvoices(prev => prev.map(i => i._id === id ? updated : i));
    } catch (err) { alert(err.message); }
  };

  const downloadPdf = (inv) => {
    const token = localStorage.getItem('token');
    const base  = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    fetch(`${base}/invoices/${inv._id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${inv.invoiceId}.pdf`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(err => alert(err.message));
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
    <div className="space-y-4 flex flex-col h-full">

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 shrink-0">
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

      {/* Table card */}
      <div className="bg-card rounded-xl border border-app flex flex-col" style={{ maxHeight: '65vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-app shrink-0">
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
          </div>
        </div>

        {/* Scrollable table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-gray-500 text-xs border-b border-app">
                <th className="text-left px-5 py-2.5 font-medium">Invoice ID</th>
                <th className="text-left px-5 py-2.5 font-medium">Partner</th>
                <th className="text-left px-5 py-2.5 font-medium">Shipment</th>
                <th className="text-left px-5 py-2.5 font-medium">Amount</th>
                <th className="text-left px-5 py-2.5 font-medium">Due Date</th>
                <th className="text-left px-5 py-2.5 font-medium">EDI 210 & 997</th>
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
                    {inv.ediSent && inv.edi997Sent
                      ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">210 & 997 Sent</span>
                      : inv.ediSent
                        ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">210 Sent</span>
                        : <span className="text-xs text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[inv.status]}`}>{inv.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inv.status === 'Paid' && (
                        <button onClick={() => downloadPdf(inv)}
                          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition cursor-pointer bg-transparent border-none">
                          <Download size={11} /> PDF
                        </button>
                      )}
                      {inv.status === 'Paid' && (
                        <button onClick={() => send210(inv._id)}
                          className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition cursor-pointer bg-transparent border-none">
                          <Send size={11} /> {inv.ediSent ? 'Send 997 Again' : 'Send 997 Receipt'}
                        </button>
                      )}
                    </div>
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
