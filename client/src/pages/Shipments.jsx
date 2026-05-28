import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Truck, CheckCircle2, Clock, Package, ChevronDown, AlertCircle, Copy, ClipboardCheck, FileCode } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { usePolling } from '../hooks/usePolling';

const STATUS_OPTIONS = ['Pending', 'Pickup', 'In Transit', 'Delivered', 'Exception'];

const STATUS_STYLE = {
  'Pending':    'bg-gray-500/20 text-secondary-app',
  'Pickup':     'bg-yellow-500/20 text-yellow-400',
  'In Transit': 'bg-blue-500/20 text-blue-400',
  'Delivered':  'bg-green-500/20 text-green-400',
  'Exception':  'bg-red-500/20 text-red-400',
};

const STATUS_MAP = { 'Pickup': 'PICKUP', 'In Transit': 'IN_TRANSIT', 'Delivered': 'DELIVERED' };
const DESC_MAP   = {
  'Pickup':     'Cargo has been picked up from the origin.',
  'In Transit': 'Cargo departed the central warehouse terminal.',
  'Delivered':  'Cargo has been delivered to the destination.',
};

function generateX12_214(s) {
  const pad     = (v, n) => String(v ?? '').padEnd(n).slice(0, n);
  const today   = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const time    = new Date().toTimeString().slice(0,5).replace(':','');
  const isaId   = (s.partner?.isaId ?? s.partner?.name ?? 'PARTNER').toUpperCase().replace(/\s+/g,'').slice(0,15);
  const ctrlNum = (s.shipmentId ?? 'SHP-000001').replace(/[^0-9]/g,'').slice(-9).padStart(9,'0');
  const routeParts = (s.route || '').split('-');
  const location   = routeParts.length > 1 ? routeParts[routeParts.length - 1].trim() : s.route || '';
  const mappedStatus = STATUS_MAP[s.status] ?? s.status?.toUpperCase().replace(/ /g,'_') ?? 'UNKNOWN';
  const desc = DESC_MAP[s.status] ?? '';

  const segments = [
    `ISA*00*${pad('',10)}*00*${pad('',10)}*ZZ*${pad('CARGO',15)}*ZZ*${pad(isaId,15)}*${today.slice(2)}*${time}*^*00501*${ctrlNum}*0*P*>`,
    `GS*QM*CARGO*${isaId}*${today}*${time}*1*X*005010`,
    `ST*214*0001`,
    `B10*${s.shipmentId ?? ''}**CRGO`,
    `L11*${s.shipmentId ?? ''}*BM`,
    `N1*SH*CarGO Logistics Services*ZZ*CARGO`,
    `N1*CN*${isaId}*ZZ*${isaId}`,
    `AT7*${mappedStatus}*NS**${today}*${time}*LT`,
    location ? `MS2*CRGO*${location}` : null,
    s.estimatedDeliveryDate
      ? `G62*68*${new Date(s.estimatedDeliveryDate).toISOString().slice(0,10).replace(/-/g,'')}`
      : null,
    desc     ? `NTE*OTH*${desc}`      : null,
    `SE*${desc ? (location ? 10 : 9) : (location ? 9 : 8)}*0001`,
    `GE*1*1`,
    `IEA*1*${ctrlNum}`,
  ].filter(Boolean);

  return segments.join('~\n') + '~';
}

function getJson214(s) {
  const routeParts = (s.route || '').split('-');
  const location   = routeParts.length > 1 ? routeParts[routeParts.length - 1].trim() : s.route || '';
  return {
    shipmentId:  s.shipmentId,
    status:      STATUS_MAP[s.status] ?? s.status,
    location,
    description: DESC_MAP[s.status] ?? '',
    ...(s.estimatedDeliveryDate ? {
      estimatedDeliveryDate: new Date(s.estimatedDeliveryDate).toISOString().slice(0, 10),
    } : {}),
  };
}

const EDI_214_LABEL = { 'Pickup': 'Pickup', 'In Transit': 'In Transit', 'Delivered': 'Delivered' };

const MILESTONES = [
  { key: 'Pending',    icon: Clock,        label: 'Pending' },
  { key: 'Pickup',     icon: Package,      label: 'Pickup' },
  { key: 'In Transit', icon: Truck,        label: 'In Transit' },
  { key: 'Delivered',  icon: CheckCircle2, label: 'Delivered' },
];
const MILESTONE_ORDER = ['Pending', 'Pickup', 'In Transit', 'Delivered'];

function isSkippingStep(from, to) {
  const fromIdx = MILESTONE_ORDER.indexOf(from);
  const toIdx   = MILESTONE_ORDER.indexOf(to);
  // Exception is always allowed; going backwards is allowed; only block forward skips
  if (toIdx === -1) return false; // Exception
  if (fromIdx === -1) return false;
  return toIdx - fromIdx > 1;
}

function MilestoneTracker({ status, onViewEdi }) {
  const currentIdx = MILESTONE_ORDER.indexOf(status === 'Exception' ? 'Pending' : status);
  const ediStatuses = ['Pickup', 'In Transit', 'Delivered'];
  return (
    <div className="flex items-center gap-1">
      {MILESTONES.map(({ key, icon: Icon, label }, i) => {
        const done    = i <= currentIdx;
        const current = i === currentIdx;
        const hasEdi  = done && ediStatuses.includes(key);
        return (
          <div key={key} className="flex items-center gap-1">
            <div
              onClick={() => hasEdi && onViewEdi && onViewEdi(key)}
              title={hasEdi ? `View EDI 214 — ${key}` : undefined}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition
                ${current ? 'bg-blue-600 text-white font-semibold'
                : done    ? 'bg-green-500/20 text-green-400'
                          : 'bg-input text-muted-app'}
                ${hasEdi ? 'cursor-pointer hover:ring-1 hover:ring-green-400/40' : ''}`}>
              <Icon size={10} />
              <span className="hidden lg:inline">{label}</span>
            </div>
            {i < MILESTONES.length - 1 && (
              <div className={`w-4 h-px ${i < currentIdx ? 'bg-green-500/40' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConfirmStatusModal({ pending, saving, onConfirm, onCancel }) {
  if (!pending) return null;
  const skipping = isSkippingStep(pending.from, pending.to);
  const fromIdx  = MILESTONE_ORDER.indexOf(pending.from);
  const toIdx    = MILESTONE_ORDER.indexOf(pending.to);
  const required = skipping ? MILESTONE_ORDER[fromIdx + 1] : null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-card border border-app rounded-2xl w-full max-w-md shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-app">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${skipping ? 'bg-red-500/15' : 'bg-yellow-500/15'}`}>
            <AlertCircle size={18} className={skipping ? 'text-red-400' : 'text-yellow-400'} />
          </div>
          <div>
            <p className="font-semibold text-app text-sm">{skipping ? 'Cannot skip status step' : 'Update shipment status?'}</p>
            <p className="text-xs text-muted-app mt-0.5 font-mono">{pending.shipmentId}</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          {skipping ? (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-400 space-y-1">
              <p className="font-medium">Status steps must be followed in order.</p>
              <p>You must set the status to <span className="font-semibold text-red-300">{required}</span> before moving to <span className="font-semibold text-red-300">{pending.to}</span>.</p>
            </div>
          ) : (
            <p className="text-sm text-secondary-app">
              Are you sure you want to change the status for{' '}
              <span className="text-app font-medium">{pending.route}</span>?
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLE[pending.from] ?? 'bg-gray-500/20 text-secondary-app'}`}>{pending.from}</span>
            <span className="text-muted-app text-xs">→</span>
            <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLE[pending.to] ?? 'bg-gray-500/20 text-secondary-app'}`}>{pending.to}</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-app">
          <button type="button" onClick={onCancel} disabled={saving}
            className="text-xs px-4 py-2 rounded-lg bg-hover border border-app text-secondary-app hover:opacity-80 transition cursor-pointer disabled:opacity-50">
            {skipping ? 'Close' : 'Cancel'}
          </button>
          {!skipping && (
            <button type="button" onClick={onConfirm} disabled={saving}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer border-none disabled:opacity-50">
              {saving && <span className="w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Updating…' : 'Yes, update status'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef  = useRef(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const update = () => {
      const r = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, left: r.right });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer border-none">
        Update Status <ChevronDown size={11} />
      </button>
      {open && createPortal(
        <div ref={menuRef}
          style={{ top: menuPos.top, left: menuPos.left, transform: 'translateX(-100%)' }}
          className="fixed z-50 bg-elevated border border-app rounded-lg shadow-xl overflow-hidden w-44">
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-hover transition cursor-pointer border-none
                ${value === s ? 'text-blue-400 bg-blue-500/10' : 'text-secondary-app'}`}>
             {s}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function ShipmentsTable() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [pending, setPending]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');
  const [x12Shipment, setX12Shipment] = useState(null);
  const [viewMode, setViewMode]       = useState('x12');
  const [copied, setCopied]           = useState(false);
  const { show: showToast, node: toastNode } = useToast();

  const load = async () => {
    try { setShipments(await api.get('/shipments')); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  usePolling(load);

  // Refresh immediately when the window regains focus (e.g. switching back from Load Tenders)
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const requestStatusChange = (id, newStatus) => {
    const current = shipments.find(s => s._id === id);
    if (!current || current.status === newStatus) return;
    setPending({ id, shipmentId: current.shipmentId, route: current.route, from: current.status, to: newStatus });
  };

  const confirmStatusChange = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      const updated = await api.put(`/shipments/${pending.id}/status`, { status: pending.to });
      setShipments(prev => prev.map(s => s._id === pending.id ? updated : s));
      setX12Shipment(prev => prev?._id === pending.id ? updated : prev);
      setPending(null);
      showToast(`Status updated to ${pending.to} — EDI 214 sent.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally { setSaving(false); }
  };

  const copyContent = (s) => {
    const text = viewMode === 'x12' ? generateX12_214(s) : JSON.stringify(getJson214(s), null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <div className="text-muted-app text-sm py-10 text-center">Loading...</div>;
  if (error)   return <div className="text-red-400 text-sm py-10 text-center">{error}</div>;

  return (
    <>
      <ConfirmStatusModal pending={pending} saving={saving} onConfirm={confirmStatusChange} onCancel={() => !saving && setPending(null)} />
      {toastNode}
      <div className="bg-card rounded-xl border border-app flex flex-col" style={{ maxHeight: '70vh' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-app shrink-0">
          <div className="flex items-center gap-2">
            <Package size={14} className="text-secondary-app" />
            <span className="font-semibold text-sm text-app">Shipments</span>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
              {shipments.filter(s => s.status === 'In Transit').length} in transit
            </span>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shipment / order ID..."
            className="text-xs px-3 py-1.5 rounded-lg bg-input border border-app text-app placeholder:text-muted-app focus:outline-none focus:border-blue-500 w-44"
          />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="text-muted-app text-xs border-b border-app">
                <th className="text-left px-5 py-2.5 font-medium">Shipment ID / Order ID</th>
                <th className="text-left px-5 py-2.5 font-medium">Date</th>
                <th className="text-left px-5 py-2.5 font-medium">Route</th>
                <th className="text-left px-5 py-2.5 font-medium">Est. Delivery</th>
                <th className="text-left px-5 py-2.5 font-medium">Milestone</th>
                <th className="text-left px-5 py-2.5 font-medium">Status</th>
                <th className="text-left px-5 py-2.5 font-medium">EDI 214</th>
                <th className="text-right px-5 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {shipments.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-muted-app text-sm">No shipments yet.</td></tr>
              )}
              {shipments.filter(s => {
                const q = search.trim().toLowerCase();
                if (!q) return true;
                return (s.shipmentId ?? '').toLowerCase().includes(q)
                  || (s.orderId ?? '').toLowerCase().includes(q);
              }).map(s => (
                <tr key={s._id} className="border-b border-subtle hover:bg-hover transition">
                  <td className="px-5 py-3.5 font-mono text-xs text-secondary-app whitespace-nowrap">
                    <p>{s.shipmentId}</p>
                    {s.orderId && <p className="text-muted-app mt-0.5">{s.orderId}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-app">
                    {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-medium text-app">{s.route}</p>
                    <p className="text-xs text-muted-app">{s.partner?.name}</p>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-secondary-app">
                    {s.estimatedDeliveryDate
                      ? new Date(s.estimatedDeliveryDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5"><MilestoneTracker status={s.status} onViewEdi={(milestoneStatus) => {
                    setViewMode('x12');
                    setCopied(false);
                    setX12Shipment({ ...s, status: milestoneStatus });
                  }} /></td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[s.status] ?? 'bg-gray-500/20 text-secondary-app'}`}>{s.status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {s.edi214Sent
                      ? s.status === 'Delivered'
                        ? <span className="text-xs flex items-center gap-1 text-purple-400 font-medium w-fit">
                            <CheckCircle2 size={10} /> 214 · {EDI_214_LABEL[s.status] ?? s.status}
                          </span>
                        : <span className="text-xs flex items-center gap-1 text-purple-400 font-medium w-fit">
                            <CheckCircle2 size={10} /> 214 · {EDI_214_LABEL[s.status] ?? s.status}
                          </span>
                      : <span className="text-xs text-muted-app">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <StatusDropdown value={s.status} onChange={val => requestStatusChange(s._id, val)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDI 214 Viewer Modal */}
      {x12Shipment && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-app rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-app shrink-0 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded shrink-0">EDI 214</span>
                <span className="text-sm font-semibold text-app shrink-0">Shipment Status</span>
                <span className="text-xs font-mono text-muted-app truncate">{x12Shipment.shipmentId}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[x12Shipment.status] ?? 'bg-gray-500/20 text-secondary-app'}`}>{x12Shipment.status}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-input border border-app rounded-lg overflow-hidden text-xs">
                  <button type="button" onClick={() => setViewMode('json')}
                    className={`px-3 py-1.5 transition cursor-pointer border-none ${viewMode === 'json' ? 'bg-blue-600 text-white' : 'text-secondary-app hover:text-app'}`}>
                    JSON
                  </button>
                  <button type="button" onClick={() => setViewMode('x12')}
                    className={`px-3 py-1.5 transition cursor-pointer border-none ${viewMode === 'x12' ? 'bg-blue-600 text-white' : 'text-secondary-app hover:text-app'}`}>
                    ANSI X12
                  </button>
                </div>
                <button type="button" onClick={() => copyContent(x12Shipment)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-input border border-app hover:bg-hover transition cursor-pointer text-secondary-app hover:text-app">
                  {copied
                    ? <><ClipboardCheck size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></>
                    : <><Copy size={12} /> Copy</>}
                </button>
                <button type="button" onClick={() => setX12Shipment(null)}
                  className="text-muted-app hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none">×</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {viewMode === 'x12' ? (
                <pre className="text-xs font-mono bg-code-block text-code-x12 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                  {generateX12_214(x12Shipment)}
                </pre>
              ) : (
                <pre className="text-xs font-mono bg-code-block text-code-json rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                  {JSON.stringify(getJson214(x12Shipment), null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default ShipmentsTable;
