import { useState, useEffect } from 'react';
import { Inbox, Truck, CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react';
import { api } from '../api';

const VEHICLE_TYPE_STYLE = {
  'L300':     'bg-blue-500/20 text-blue-400',
  'Truck':    'bg-orange-500/20 text-orange-400',
  'Expander': 'bg-purple-500/20 text-purple-400',
};

const STATUS_STYLE = {
  'Pending':  'bg-yellow-500/20 text-yellow-400',
  'Accepted': 'bg-green-500/20 text-green-400',
  'Rejected': 'bg-red-500/20 text-red-400',
};

// Modal to simulate an incoming EDI 204 from a partner
function VehicleDropdown({ value, onChange, vehicles }) {
  const [open, setOpen] = useState(false);
  const selected = vehicles.find(v => v._id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-hover border border-app text-gray-300 hover:bg-white/15 transition cursor-pointer min-w-[180px] justify-between"
      >
        <span className="flex items-center gap-1.5">
          <Truck size={11} className="text-gray-500" />
          {selected ? `${selected.name} · ${selected.plate}` : 'Assign vehicle...'}
        </span>
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-30 bg-elevated border border-app rounded-lg shadow-xl overflow-hidden w-64">
          {vehicles.filter(v => v.status === 'Available').map(v => (
            <button
              key={v._id}
              onClick={() => { onChange(v._id); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-xs hover:bg-hover transition cursor-pointer border-none flex items-center justify-between
                ${value === v._id ? 'bg-blue-500/10 text-blue-400' : 'text-gray-300'}`}
            >
              <span className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${VEHICLE_TYPE_STYLE[v.type]}`}>{v.type}</span>
                <span>{v.name} · {v.plate}</span>
              </span>
              <span className="text-gray-500">{v.capacity}</span>
            </button>
          ))}
          {vehicles.filter(v => v.status === 'Available').length === 0 && (
            <p className="text-xs text-gray-600 px-3 py-3">No available vehicles</p>
          )}
        </div>
      )}
    </div>
  );
}

function TenderDetail({ tender, vehicles, onClose, onRespond }) {
  const [vehicle, setVehicle] = useState(tender.assignedVehicle?._id ?? null);
  const [loading, setLoading] = useState(false);

  const handleRespond = async (status) => {
    setLoading(true);
    await onRespond(tender._id, status, vehicle);
    setLoading(false);
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-app rounded-2xl w-[520px] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-app">
          <div className="flex items-center gap-2">
            <Inbox size={15} className="text-blue-400" />
            <span className="font-semibold text-app text-sm">EDI 204 — Load Tender</span>
            <span className="text-xs font-mono text-gray-500">{tender.tenderId}</span>
          </div>
          <button onClick={onClose} className="text-muted-app hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-input rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 mb-1">FROM PARTNER</p>
              <p className="text-sm font-semibold text-app">{tender.partner?.name}</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{tender.ediRef}</p>
            </div>
            <div className="bg-input rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 mb-1">SHIPMENT</p>
              <p className="text-sm font-semibold text-app">{tender.shipmentId}</p>
              <p className="text-xs text-gray-500 mt-0.5">{tender.route}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-input rounded-lg px-4 py-3 space-y-2">
              <p className="text-[10px] text-gray-500">PICKUP DATE</p>
              <p className="text-xs text-app">{fmt(tender.pickupDate)}</p>
              <p className="text-[10px] text-gray-500 mt-1">DELIVERY DATE</p>
              <p className="text-xs text-app">{fmt(tender.deliveryDate)}</p>
            </div>
            <div className="bg-input rounded-lg px-4 py-3 space-y-2">
              <p className="text-[10px] text-gray-500">WEIGHT</p>
              <p className="text-xs text-app">{tender.weight || '—'}</p>
              <p className="text-[10px] text-gray-500 mt-1">COMMODITY</p>
              <p className="text-xs text-app">{tender.commodity || '—'}</p>
            </div>
          </div>

          <div className="bg-input rounded-lg px-4 py-3">
            <p className="text-[10px] text-gray-500 mb-2">ASSIGN VEHICLE (990 Response)</p>
            <VehicleDropdown value={vehicle} onChange={setVehicle} vehicles={vehicles} />
            {vehicle && (
              <p className="text-[10px] text-green-400 mt-2 flex items-center gap-1">
                <CheckCircle2 size={10} /> Vehicle assigned — ready to send 990 Accepted
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-app">
          {tender.status === 'Pending' ? (
            <>
              <button
                disabled={loading}
                onClick={() => handleRespond('Rejected')}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition cursor-pointer font-medium disabled:opacity-50"
              >
                <XCircle size={12} /> Send 990 — Rejected
              </button>
              <button
                disabled={!vehicle || loading}
                onClick={() => handleRespond('Accepted')}
                className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-medium transition cursor-pointer border-none
                  ${vehicle && !loading ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-input text-gray-600 cursor-not-allowed'}`}
              >
                <CheckCircle2 size={12} /> Send 990 — Accepted
              </button>
            </>
          ) : (
            <span className={`text-xs px-3 py-1.5 rounded-full ${STATUS_STYLE[tender.status]}`}>
              990 {tender.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadTenders() {
  const [tenders, setTenders]   = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const load = async () => {
    try {
      const [t, v] = await Promise.all([
        api.get('/loadtenders'),
        api.get('/vehicles'),
      ]);
      setTenders(t);
      setVehicles(v);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRespond = async (id, status, vehicleId) => {
    try {
      await api.post(`/loadtenders/${id}/respond`, { status, vehicleId });
      await load();
      setSelected(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const pending  = tenders.filter(t => t.status === 'Pending').length;
  const accepted = tenders.filter(t => t.status === 'Accepted').length;
  const rejected = tenders.filter(t => t.status === 'Rejected').length;

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) return <div className="text-gray-500 text-sm py-10 text-center">Loading...</div>;
  if (error)   return <div className="text-red-400 text-sm py-10 text-center">{error}</div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending 204s', value: pending,  icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Accepted',     value: accepted, icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Rejected',     value: rejected, icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl p-4 border ${bg} flex items-center gap-3`}>
            <Icon size={18} className={color} />
            <div>
              <p className="text-2xl font-bold text-app">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-app overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-app">
          <div className="flex items-center gap-2">
            <Inbox size={14} className="text-gray-400" />
            <span className="font-semibold text-sm text-app">Incoming Load Tenders (EDI 204)</span>
            {pending > 0 && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pending} awaiting response</span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-app">
                <th className="text-left px-5 py-2.5 font-medium">Tender ID</th>
                <th className="text-left px-5 py-2.5 font-medium">Partner</th>
                <th className="text-left px-5 py-2.5 font-medium">Shipment</th>
                <th className="text-left px-5 py-2.5 font-medium">Route</th>
                <th className="text-left px-5 py-2.5 font-medium">Pickup</th>
                <th className="text-left px-5 py-2.5 font-medium">Weight</th>
                <th className="text-left px-5 py-2.5 font-medium">Vehicle</th>
                <th className="text-left px-5 py-2.5 font-medium">990 Status</th>
                <th className="text-left px-5 py-2.5 font-medium">Received</th>
                <th className="text-right px-5 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {tenders.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10 text-gray-600 text-sm">No load tenders yet.</td></tr>
              )}
              {tenders.map(t => {
                const v = t.assignedVehicle;
                return (
                  <tr key={t._id} className="border-b border-subtle hover:bg-hover transition">
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{t.tenderId}</td>
                    <td className="px-5 py-3 text-xs text-app font-medium">{t.partner?.name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{t.shipmentId}</td>
                    <td className="px-5 py-3 text-xs text-gray-300">{t.route}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{fmt(t.pickupDate)}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{t.weight || '—'}</td>
                    <td className="px-5 py-3">
                      {v ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${VEHICLE_TYPE_STYLE[v.type]}`}>
                          {v.type} · {v.plate}
                        </span>
                      ) : <span className="text-xs text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{fmtTime(t.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setSelected(t)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer border-none
                          ${t.status === 'Pending' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-input hover:bg-white/10 text-gray-400 border border-app'}`}
                      >
                        {t.status === 'Pending' ? 'Respond' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <TenderDetail
          tender={selected}
          vehicles={vehicles}
          onClose={() => setSelected(null)}
          onRespond={handleRespond}
        />
      )}
    </div>
  );
}

export default LoadTenders;
