import { useState } from 'react';
import { FileText, Search, AlertTriangle, CheckCircle2, Clock, Send, Download, Copy, ClipboardCheck, Eye, X } from 'lucide-react';
import { api } from '../api';
import { usePolling } from '../hooks/usePolling';
import { useToast } from '../components/Toast';

const STATUS_STYLE = {
  'Paid':    'bg-green-500/20 text-green-400',
  'Pending': 'bg-yellow-500/20 text-yellow-400',
  'Overdue': 'bg-red-500/20 text-red-400',
  'Draft':   'bg-gray-500/20 text-gray-400',
};

function generateX12_820(inv) {
  const pad     = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
  const today   = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const time    = new Date().toTimeString().slice(0,5).replace(':','');
  const isaId   = (inv.partner?.isaId ?? inv.partner?.name ?? 'PARTNER').toUpperCase().replace(/\s+/g,'').slice(0,15);
  const ctrlNum = (inv.invoiceId ?? 'INV-000001').replace('INV-','').padStart(9,'0');
  const amt     = Number(inv.amount ?? 0).toFixed(2);

  // 820 is INBOUND — partner is the sender, CARGO is the receiver
  const segments = [
    `ISA*00*${pad('',10)}*00*${pad('',10)}*ZZ*${pad(isaId,15)}*ZZ*${pad('CARGO',15)}*${today.slice(2)}*${time}*^*00501*${ctrlNum}*0*P*>`,
    `GS*RA*${isaId}*CARGO*${today}*${time}*1*X*005010`,
    `ST*820*0001`,
    `BPR*C*${amt}*C*ACH***01***${today}`,
    `TRN*1*${inv.invoiceId ?? ''}*${isaId}`,
    `REF*ST*PAID`,
    inv.shipment?.shipmentId ? `REF*BM*${inv.shipment.shipmentId}` : null,
    `DTM*097*${today}`,
    `N1*PE*CarGO Logistics Services*ZZ*CARGO`,
    `N1*PR*${inv.partner?.name ?? isaId}*ZZ*${isaId}`,
    `RMR*IV*${inv.invoiceId ?? ''}**${amt}`,
  ].filter(Boolean);

  const seCount = segments.length - 2;
  segments.push(`SE*${seCount}*0001`);
  segments.push(`GE*1*1`);
  segments.push(`IEA*1*${ctrlNum}`);

  return segments.join('~\n') + '~';
}

function getJson820(inv) {
  return {
    invoiceNumber: inv.invoiceId,
    shipmentId:    inv.shipment?.shipmentId ?? '',
    status:        'PAID',
  };
}
function generateX12_210(inv) {
  const pad     = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
  const today   = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const time    = new Date().toTimeString().slice(0,5).replace(':','');
  const isaId   = (inv.partner?.isaId ?? inv.partner?.name ?? 'PARTNER').toUpperCase().replace(/\s+/g,'').slice(0,15);
  const ctrlNum = (inv.invoiceId ?? 'INV-000001').replace('INV-','').padStart(9,'0');
  const amt     = Number(inv.amount ?? 0).toFixed(2);

  const segments = [
    `ISA*00*${pad('',10)}*00*${pad('',10)}*ZZ*${pad('CARGO',15)}*ZZ*${pad(isaId,15)}*${today.slice(2)}*${time}*^*00501*${ctrlNum}*0*P*>`,
    `GS*IM*CARGO*${isaId}*${today}*${time}*1*X*005010`,
    `ST*210*0001`,
    `B3**${inv.invoiceId ?? ''}**PP*${today}**${amt}*${today}*${isaId}`,
    `C3*PHP`,
    inv.shipment?.shipmentId ? `N9*BM*${inv.shipment.shipmentId}` : null,
    inv.shipment?.route      ? `N9*RT*${inv.shipment.route}`      : null,
    `N1*BT*${inv.partner?.name ?? isaId}*ZZ*${isaId}`,
    `N1*SF*CarGO Logistics Services*ZZ*CARGO`,
    `L3*${amt}*G***${amt}`,
  ].filter(Boolean);

  const seCount = segments.length - 2;
  segments.push(`SE*${seCount}*0001`);
  segments.push(`GE*1*1`);
  segments.push(`IEA*1*${ctrlNum}`);

  return segments.join('~\n') + '~';
}

function generateX12_997(inv) {
  const pad     = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
  const today   = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const time    = new Date().toTimeString().slice(0,5).replace(':','');
  const isaId   = (inv.partner?.isaId ?? inv.partner?.name ?? 'PARTNER').toUpperCase().replace(/\s+/g,'').slice(0,15);
  const ctrlNum = (inv.invoiceId ?? 'INV-000001').replace('INV-','').padStart(9,'0');

  const segments = [
    `ISA*00*${pad('',10)}*00*${pad('',10)}*ZZ*${pad('CARGO',15)}*ZZ*${pad(isaId,15)}*${today.slice(2)}*${time}*^*00501*${ctrlNum}*0*P*>`,
    `GS*FA*CARGO*${isaId}*${today}*${time}*1*X*005010`,
    `ST*997*0001`,
    `AK1*IM*1`,
    `AK2*210*0001`,
    `AK5*A`,
    `AK9*A*1*1*1`,
    `SE*6*0001`,
    `GE*1*1`,
    `IEA*1*${ctrlNum}`,
  ];

  return segments.join('~\n') + '~';
}

function getJson210(inv) {
  return {
    shipmentId:  inv.shipment?.shipmentId ?? '',
    invoiceId:   inv.invoiceId,
    totalAmount: inv.amount,
    dueDate:     inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : null,
    status:      inv.status ?? 'Pending',
  };
}

function getJson997(inv) {
  return {
    shipmentId: inv.shipment?.shipmentId ?? '',
    pdfUrl:     inv.pdfToken
      ? `${(typeof window !== 'undefined' ? window.location.origin : '')}/api/invoices/pdf/${inv.pdfToken}`
      : null,
  };
}

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(new Set());
  const [x12Invoice, setX12Invoice] = useState(null);
  const [ediTab, setEdiTab]         = useState('210');
  const [viewMode, setViewMode]     = useState('x12');
  const [copied, setCopied]         = useState(false);
  const [x820Invoice, setX820Invoice] = useState(null);
  const [copied820, setCopied820]     = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const { show: showToast, node: toastNode } = useToast();

  const load = () =>
    api.get('/invoices')
      .then(data => setInvoices(data))
      .catch(console.error)
      .finally(() => setLoading(false));

  usePolling(load);

  const send210 = async (id) => {
    if (sending.has(id)) return;
    setSending(prev => new Set(prev).add(id));
    try {
      const updated = await api.post(`/invoices/${id}/send210`, {});
      setInvoices(prev => prev.map(i => i._id === id ? updated : i));
      setViewInvoice(updated);
      showToast('997 receipt sent successfully.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSending(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const copyX12 = (inv) => {
    const content = viewMode === 'x12'
      ? (ediTab === '210' ? generateX12_210(inv) : generateX12_997(inv))
      : JSON.stringify(ediTab === '210' ? getJson210(inv) : getJson997(inv), null, 2);
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadPdf = (inv) => {
    const token = localStorage.getItem('token');
    const base  = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    fetch(`${base}/invoices/${inv._id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
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
    <>
    <div className="space-y-4 flex flex-col h-full">
      {toastNode}

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
                <th className="text-left px-5 py-2.5 font-medium">Created</th>
                <th className="text-left px-5 py-2.5 font-medium">Due Date</th>
                <th className="text-left px-5 py-2.5 font-medium">Status / 820</th>
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
                  <td className="px-5 py-3 text-xs text-gray-400">
                    {inv.createdAt ? new Date(inv.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className={`px-5 py-3 text-xs ${inv.status === 'Overdue' ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
                    {fmtDate(inv.dueDate)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <button
                        type="button"
                        onClick={() => inv.status === 'Paid' ? setX820Invoice(inv) : null}
                        className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[inv.status]} ${inv.status === 'Paid' ? 'cursor-pointer hover:ring-1 hover:ring-green-400/40' : 'cursor-default'}`}>
                        {inv.status}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setViewInvoice(inv)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-app transition cursor-pointer bg-transparent border-none ml-auto">
                      <Eye size={11} /> View
                    </button>
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

    {/* Invoice Detail Modal */}
    {viewInvoice && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-card border border-app rounded-2xl w-full max-w-md shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-app">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-gray-400" />
              <span className="font-semibold text-sm text-app">Invoice</span>
              <span className="text-xs font-mono text-gray-500">{viewInvoice.invoiceId}</span>
            </div>
            <button onClick={() => setViewInvoice(null)} className="text-gray-500 hover:text-app bg-transparent border-none cursor-pointer"><X size={15} /></button>
          </div>

          {/* Details */}
          <div className="px-6 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-gray-500 mb-0.5">Partner</p><p className="text-app font-medium">{viewInvoice.partner?.name}</p></div>
              <div><p className="text-gray-500 mb-0.5">Shipment</p><p className="text-app font-mono">{viewInvoice.shipment?.shipmentId}</p></div>
              <div><p className="text-gray-500 mb-0.5">Amount</p><p className="text-app font-semibold">{fmtAmt(viewInvoice.amount)}</p></div>
              <div><p className="text-gray-500 mb-0.5">Created</p><p className="text-app">{viewInvoice.createdAt ? new Date(viewInvoice.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</p></div>
              <div><p className="text-gray-500 mb-0.5">Due Date</p><p className={viewInvoice.status === 'Overdue' ? 'text-red-400 font-medium' : 'text-app'}>{fmtDate(viewInvoice.dueDate)}</p></div>
              <div><p className="text-gray-500 mb-0.5">Status</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[viewInvoice.status]}`}>{viewInvoice.status}</span>
              </div>
              <div><p className="text-gray-500 mb-0.5">EDI</p>
                {viewInvoice.ediSent && viewInvoice.edi997Sent
                  ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">210 & 997 Sent</span>
                  : viewInvoice.ediSent
                    ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">210 Sent</span>
                    : <span className="text-xs text-gray-600">—</span>}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-6 py-4 border-t border-app">
            <button onClick={() => { setCopied(false); setEdiTab('210'); setViewMode('x12'); setX12Invoice(viewInvoice); setViewInvoice(null); }}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-input border border-app text-gray-400 hover:text-app transition cursor-pointer">
              <Copy size={11} /> View X12
            </button>
            {viewInvoice.status === 'Paid' && (
              <button onClick={() => { downloadPdf(viewInvoice); }}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer border-none">
                <Download size={11} /> View PDF
              </button>
            )}
            {viewInvoice.status === 'Paid' && (
              <button onClick={() => send210(viewInvoice._id)}
                disabled={sending.has(viewInvoice._id)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition cursor-pointer border-none disabled:opacity-50">
                {sending.has(viewInvoice._id)
                  ? <><span className="w-2.5 h-2.5 border border-white/40 border-t-transparent rounded-full animate-spin" /> Sending…</>
                  : <><Send size={11} /> {viewInvoice.edi997Sent ? 'Resend (997)' : 'Send Receipt (997)'}</>}
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* EDI Viewer Modal */}
    {x12Invoice && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-card border border-app rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-app shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">EDI</span>
              <span className="text-sm font-semibold text-app">Message Viewer</span>
              <span className="text-xs font-mono text-gray-500">{x12Invoice.invoiceId}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* JSON / X12 toggle */}
              <div className="flex items-center bg-input border border-app rounded-lg overflow-hidden text-xs">
                <button type="button" onClick={() => setViewMode('json')}
                  className={`px-3 py-1.5 transition cursor-pointer border-none ${viewMode === 'json' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-app'}`}>
                  JSON
                </button>
                <button type="button" onClick={() => setViewMode('x12')}
                  className={`px-3 py-1.5 transition cursor-pointer border-none ${viewMode === 'x12' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-app'}`}>
                  ANSI X12
                </button>
              </div>
              <button type="button" onClick={() => copyX12(x12Invoice)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-input border border-app hover:bg-hover transition cursor-pointer text-gray-400 hover:text-app">
                {copied
                  ? <><ClipboardCheck size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></>
                  : <><Copy size={12} /> Copy</>}
              </button>
              <button type="button" onClick={() => setX12Invoice(null)}
                className="text-muted-app hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none">×</button>
            </div>
          </div>

          {/* EDI tabs — 210 always, 997 only if sent */}
          <div className="flex items-center gap-1 px-6 pt-3 shrink-0">
            <button type="button" onClick={() => setEdiTab('210')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer border
                ${ediTab === '210' ? 'bg-purple-600 text-white border-purple-600' : 'bg-input text-gray-400 border-app hover:text-app'}`}>
              EDI 210 — Invoice
            </button>
            {x12Invoice.edi997Sent && (
              <button type="button" onClick={() => setEdiTab('997')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer border
                  ${ediTab === '997' ? 'bg-purple-600 text-white border-purple-600' : 'bg-input text-gray-400 border-app hover:text-app'}`}>
                EDI 997 — Acknowledgement
              </button>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-4">
            {viewMode === 'x12' ? (
              <pre className="text-xs text-green-400 font-mono bg-black/40 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                {ediTab === '210' ? generateX12_210(x12Invoice) : generateX12_997(x12Invoice)}
              </pre>
            ) : (
              <pre className="text-xs text-yellow-300 font-mono bg-black/40 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                {JSON.stringify(ediTab === '210' ? getJson210(x12Invoice) : getJson997(x12Invoice), null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    )}
    {/* EDI 820 Viewer Modal */}
    {x820Invoice && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-card border border-app rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-app shrink-0 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded shrink-0">EDI 820</span>
              <span className="text-sm font-semibold text-app shrink-0">Payment Remittance</span>
              <span className="text-xs font-mono text-gray-500 truncate">{x820Invoice.invoiceId}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-input border border-app rounded-lg overflow-hidden text-xs">
                <button type="button" onClick={() => { setViewMode('json'); }}
                  className={`px-3 py-1.5 transition cursor-pointer border-none ${viewMode === 'json' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-app'}`}>
                  JSON
                </button>
                <button type="button" onClick={() => setViewMode('x12')}
                  className={`px-3 py-1.5 transition cursor-pointer border-none ${viewMode === 'x12' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-app'}`}>
                  ANSI X12
                </button>
              </div>
              <button type="button" onClick={() => {
                const text = viewMode === 'x12' ? generateX12_820(x820Invoice) : JSON.stringify(getJson820(x820Invoice), null, 2);
                navigator.clipboard.writeText(text).then(() => { setCopied820(true); setTimeout(() => setCopied820(false), 2000); });
              }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-input border border-app hover:bg-hover transition cursor-pointer text-gray-400 hover:text-app">
                {copied820 ? <><ClipboardCheck size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy size={12} /> Copy</>}
              </button>
              <button type="button" onClick={() => setX820Invoice(null)}
                className="text-muted-app hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none">×</button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-4">
            {viewMode === 'x12' ? (
              <pre className="text-xs text-green-400 font-mono bg-black/40 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                {generateX12_820(x820Invoice)}
              </pre>
            ) : (
              <pre className="text-xs text-yellow-300 font-mono bg-black/40 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                {JSON.stringify(getJson820(x820Invoice), null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    )}
  </>
  );
}

export default Invoices;
