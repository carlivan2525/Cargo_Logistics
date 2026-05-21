import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Truck, CheckCircle2, Clock, Package, ChevronDown, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';

const STATUS_OPTIONS = ['Pending', 'Pickup', 'In Transit', 'Delivered', 'Exception'];

const STATUS_STYLE = {
  'Pending':    'bg-gray-500/20 text-gray-400',
  'Pickup':     'bg-yellow-500/20 text-yellow-400',
  'In Transit': 'bg-blue-500/20 text-blue-400',
  'Delivered':  'bg-green-500/20 text-green-400',
  'Exception':  'bg-red-500/20 text-red-400',
};

const EDI_214_STATUSES = ['Pickup', 'In Transit', 'Delivered'];

const EDI_214_LABEL = { 'Pickup': 'Pickup', 'In Transit': 'In Transit', 'Delivered': 'Delivered' };

const MILESTONES = [
  { key: 'Pending',    icon: Clock,        label: 'Pending' },
  { key: 'Pickup',     icon: Package,      label: 'Pickup' },
  { key: 'In Transit', icon: Truck,        label: 'In Transit' },
  { key: 'Delivered',  icon: CheckCircle2, label: 'Delivered' },
];
const MILESTONE_ORDER = ['Pending', 'Pickup', 'In Transit', 'Delivered'];

function MilestoneTracker({ status }) {
  const currentIdx = MILESTONE_ORDER.indexOf(status === 'Exception' ? 'Pending' : status);
  return (
    <div className="flex items-center gap-1">
      {MILESTONES.map(({ key, icon: Icon, label }, i) => {
        const done    = i <= currentIdx;
        const current = i === currentIdx;
        return (
          <div key={key} className="flex items-center gap-1">
            <div className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition
              ${current ? 'bg-blue-600 text-white font-semibold'
              : done    ? 'bg-green-500/20 text-green-400'
                        : 'bg-input text-gray-600'}`}>
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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-card border border-app rounded-2xl w-full max-w-md shadow-2xl mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-app">
          <div className="w-9 h-9 rounded-full bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={18} className="text-yellow-400" />
          </div>
          <div>
            <p className="font-semibold text-app text-sm">Update shipment status?</p>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{pending.shipmentId}</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-400">
            Are you sure you want to change the status for{' '}
            <span className="text-app font-medium">{pending.route}</span>?
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLE[pending.from] ?? 'bg-gray-500/20 text-gray-400'}`}>
              {pending.from}
            </span>
            <span className="text-gray-600 text-xs">→</span>
            <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLE[pending.to] ?? 'bg-gray-500/20 text-gray-400'}`}>
              {pending.to}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-app">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="text-xs px-4 py-2 rounded-lg bg-hover border border-app text-secondary-app hover:opacity-80 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer border-none disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Yes, update status'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const updatePos = () => {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right });
    };
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer border-none"
      >
        Update Status <ChevronDown size={11} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{ top: menuPos.top, left: menuPos.left, transform: 'translateX(-100%)' }}
          className="fixed z-50 bg-elevated border border-app rounded-lg shadow-xl overflow-hidden w-44"
        >
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-hover transition cursor-pointer border-none
                ${value === s ? 'text-blue-400 bg-blue-500/10' : 'text-gray-300'}`}
            >
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
  const { show: showToast, node: toastNode } = useToast();

  const load = async () => {
    try {
      setShipments(await api.get('/shipments'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const requestStatusChange = (id, newStatus) => {
    const current = shipments.find(s => s._id === id);
    if (!current || current.status === newStatus) return;
    setPending({
      id,
      shipmentId: current.shipmentId,
      route: current.route,
      from: current.status,
      to: newStatus,
    });
  };

  const confirmStatusChange = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      const updated = await api.put(`/shipments/${pending.id}/status`, { status: pending.to });
      setShipments(prev => prev.map(s => s._id === pending.id ? updated : s));
      setPending(null);
      showToast(`Status updated to ${pending.to} — EDI 214 sent.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500 text-sm py-10 text-center">Loading...</div>;
  if (error)   return <div className="text-red-400 text-sm py-10 text-center">{error}</div>;

  return (
    <>
    <ConfirmStatusModal
      pending={pending}
      saving={saving}
      onConfirm={confirmStatusChange}
      onCancel={() => !saving && setPending(null)}
    />
    {toastNode}
    <div className="bg-card rounded-xl border border-app flex flex-col" style={{ maxHeight: '70vh' }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-app shrink-0">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-gray-400" />
          <span className="font-semibold text-sm text-app">Shipments</span>
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
            {shipments.filter(s => s.status === 'In Transit').length} in transit
          </span>
        </div>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="text-gray-500 text-xs border-b border-app">
              <th className="text-left px-5 py-2.5 font-medium">Shipment ID</th>
              <th className="text-left px-5 py-2.5 font-medium">Route</th>
              <th className="text-left px-5 py-2.5 font-medium">Current Milestone</th>
              <th className="text-left px-5 py-2.5 font-medium">Status</th>
              <th className="text-left px-5 py-2.5 font-medium">EDI 214</th>
              <th className="text-right px-5 py-2.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {shipments.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-600 text-sm">No shipments yet. Accept a load tender first.</td></tr>
            )}
            {shipments.map(s => (
              <tr key={s._id} className="border-b border-subtle hover:bg-hover transition">
                <td className="px-5 py-3.5 font-mono text-xs text-gray-400">{s.shipmentId}</td>
                <td className="px-5 py-3.5">
                  <p className="text-xs font-medium text-app">{s.route}</p>
                  <p className="text-xs text-gray-500">{s.partner?.name}</p>
                </td>
                <td className="px-5 py-3.5"><MilestoneTracker status={s.status} /></td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[s.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {s.edi214Sent ? (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 font-medium w-fit">
                      <CheckCircle2 size={10} />
                      214 · {EDI_214_LABEL[s.status] ?? s.status}
                    </span>
                  ) : <span className="text-xs text-gray-600">—</span>}
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
    </>
  );
}

export default ShipmentsTable;
