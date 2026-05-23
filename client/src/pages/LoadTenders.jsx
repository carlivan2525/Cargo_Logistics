import { useState, useEffect } from 'react';
import { Inbox, Truck, CheckCircle2, XCircle, Clock, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api';
import { canVehicleCarryLoad } from '../utils/capacity';
import { useToast } from '../components/Toast';
import { usePolling } from '../hooks/usePolling';

const VEHICLE_TYPE_STYLE = {
  'L300':       'bg-blue-500/20 text-blue-400',
  'Truck':      'bg-orange-500/20 text-orange-400',
  'Expander':   'bg-purple-500/20 text-purple-400',
  'Motorcycle': 'bg-green-500/20 text-green-400',
};

const STATUS_STYLE = {
  'Pending':  'bg-yellow-500/20 text-yellow-400',
  'Accepted': 'bg-green-500/20 text-green-400',
  'Rejected': 'bg-red-500/20 text-red-400',
};

const dash = (v) => (v && String(v).trim() ? v : '—');

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-app mt-0.5 break-words">{dash(value)}</p>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-input rounded-lg px-4 py-3 space-y-3">
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
        {subtitle && <p className="text-[10px] text-gray-600 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function VehicleDropdown({ value, onChange, vehicles, loadWeight }) {
  const [open, setOpen] = useState(false);
  const selected = vehicles.find(v => v._id === value);

  return (
    <div className="relative">
      <button
        type="button"
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
          {vehicles.map(v => {
            const check = canVehicleCarryLoad(v, loadWeight);
            return (
              <button
                key={v._id}
                type="button"
                onClick={() => { if (check.ok) { onChange(v._id); setOpen(false); } }}
                disabled={!check.ok}
                className={`w-full text-left px-3 py-2.5 text-xs transition border-none flex items-center justify-between
                  ${!check.ok ? 'opacity-50 cursor-not-allowed bg-red-500/5 text-red-300' : 'hover:bg-hover cursor-pointer text-gray-300'}
                  ${value === v._id && check.ok ? 'bg-blue-500/10 text-blue-400' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${VEHICLE_TYPE_STYLE[v.type]}`}>{v.type}</span>
                  <span>{v.name} · {v.plate}</span>
                </span>
                <span className={check.ok ? 'text-gray-500' : 'text-red-400'}>{v.capacity}</span>
              </button>
            );
          })}
          {vehicles.length === 0 && (
            <p className="text-xs text-gray-600 px-3 py-3">No vehicles in fleet</p>
          )}
        </div>
      )}
    </div>
  );
}

function TenderDetail({ tender: initialTender, vehicles, onClose, onRespond }) {
  const [tender, setTender] = useState(initialTender);
  const [detailLoading, setDetailLoading] = useState(true);
  const [vehicle, setVehicle] = useState(initialTender.assignedVehicle?._id ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fresh = await api.get(`/loadtenders/${initialTender._id}`);
        if (!cancelled) {
          setTender(fresh);
          setVehicle(fresh.assignedVehicle?._id ?? null);
        }
      } catch {
        if (!cancelled) setTender(initialTender);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [initialTender._id]);

  const selectedVehicle = vehicles.find(v => v._id === vehicle);
  const capacityCheck = selectedVehicle
    ? canVehicleCarryLoad(selectedVehicle, tender.weight)
    : null;
  const canAccept = vehicle && capacityCheck?.ok;

  const handleRespond = async (status) => {
    if (status === 'Accepted' && !canAccept) return;
    setLoading(true);
    await onRespond(tender._id, status, vehicle);
    setLoading(false);
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const origin = tender.originAddress || {};

  if (detailLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-card border border-app rounded-2xl px-8 py-6 text-sm text-gray-400">Loading 204 details…</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-app rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-app shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Inbox size={15} className="text-blue-400" />
            <span className="font-semibold text-app text-sm">EDI 204 — Load Tender</span>
            <span className="text-xs font-mono text-gray-500">{tender.tenderId}</span>
            {tender.orderId && (
              <span className="text-xs font-mono text-gray-500">· {tender.orderId}</span>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-muted-app hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div>
              <p className="text-[10px] text-gray-500">ORDER</p>
              <p className="font-mono text-sm font-semibold text-app">{dash(tender.orderId)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">SHIPMENT</p>
              <p className="font-mono text-sm text-app">{tender.shipmentId}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-500">ROUTE</p>
              <p className="text-sm text-app truncate">{tender.route}</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLE[tender.status]}`}>{tender.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-input rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 mb-1">PARTNER</p>
              <p className="font-semibold text-app">{tender.partner?.name}</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{tender.ediRef}</p>
            </div>
            <div className="bg-input rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 mb-1">TENDER REF</p>
              <p className="font-semibold text-app font-mono text-sm">{tender.tenderId}</p>
              <p className="text-xs text-gray-500 mt-0.5">EDI 204 inbound</p>
            </div>
          </div>

          <Section title="Carrier identity">
            <div className="grid grid-cols-3 gap-3">
              <DetailField label="Carrier ID" value={tender.carrierId} />
              <DetailField label="Carrier name" value={tender.carrierName} />
              <DetailField label="SCAC code" value={tender.carrierScac} />
            </div>
          </Section>

          <Section title="Schedule">
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Pickup date" value={fmt(tender.pickupDate)} />
              <DetailField label="Est. delivery" value={fmt(tender.deliveryDate)} />
            </div>
          </Section>

          <Section title="Origin address (warehouse)" subtitle="Customer 204 · originAddress">
            <div className="rounded-lg border border-app bg-card/40 p-3 grid grid-cols-2 gap-3">
              <DetailField label="Location name" value={origin.locationName} />
              <DetailField label="Region" value={origin.region} />
              <DetailField label="City / municipality" value={origin.city} />
              <DetailField label="ZIP code" value={origin.zipCode} />
              <DetailField label="Contact person" value={origin.contactPerson} />
              <DetailField label="Contact phone" value={origin.contactPhone} />
            </div>
          </Section>

          <Section title="Load">
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Weight" value={tender.weight} />
              <DetailField label="Commodity" value={tender.commodity} />
            </div>
          </Section>

          <div className="bg-input rounded-lg px-4 py-3">
            <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wide">Assign vehicle (990 response)</p>
            <VehicleDropdown value={vehicle} onChange={setVehicle} vehicles={vehicles} loadWeight={tender.weight} />
            {vehicle && capacityCheck?.ok && (
              <p className="text-[10px] text-green-400 mt-2 flex items-center gap-1">
                <CheckCircle2 size={10} /> Ready to send 990 Accepted
              </p>
            )}
            {vehicle && capacityCheck && !capacityCheck.ok && (
              <p className="text-xs text-red-400 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
                {capacityCheck.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-app shrink-0">
          {tender.status === 'Pending' ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleRespond('Rejected')}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition cursor-pointer font-medium disabled:opacity-50"
              >
                <XCircle size={12} /> Send 990 — Rejected
              </button>
              <button
                type="button"
                disabled={!canAccept || loading}
                onClick={() => handleRespond('Accepted')}
                className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-medium transition cursor-pointer border-none
                  ${canAccept && !loading ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-input text-gray-600 cursor-not-allowed'}`}
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
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const { show: showToast, node: toastNode } = useToast();

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
  usePolling(load);

  const handleRespond = async (id, status, vehicleId) => {
    try {
      await api.post(`/loadtenders/${id}/respond`, { status, vehicleId });
      await load();
      setSelected(null);
      showToast(
        status === 'Accepted' ? '990 Accepted — shipment created successfully.' : '990 Rejected — tender declined.',
        status === 'Accepted' ? 'success' : 'error'
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const pending  = tenders.filter(t => t.status === 'Pending').length;
  const accepted = tenders.filter(t => t.status === 'Accepted').length;
  const rejected = tenders.filter(t => t.status === 'Rejected').length;
  const fleetCount = vehicles.length;

  const filtered = filterStatus === 'All' ? tenders : tenders.filter(t => t.status === filterStatus);
  const displayed = search.trim()
    ? filtered.filter(t => (t.shipmentId ?? '').toLowerCase().includes(search.trim().toLowerCase()))
    : filtered;

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const fmtTime = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) return <div className="text-gray-500 text-sm py-10 text-center">Loading...</div>;
  if (error)   return <div className="text-red-400 text-sm py-10 text-center">{error}</div>;

  return (
    <>
      <div className="bg-card rounded-xl border border-app flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-app shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Inbox size={14} className="text-gray-400" />
            <span className="font-semibold text-sm text-app">Incoming Load Tenders (EDI 204)</span>
            {pending > 0 && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pending} awaiting response</span>
            )}
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">{fleetCount} trucks in fleet</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search shipment ID..."
              className="text-xs px-3 py-1.5 rounded-lg bg-input border border-app text-app placeholder-gray-600 focus:outline-none focus:border-blue-500 w-44 mr-2"
            />
            {[
              { label: 'All',      count: tenders.length },
              { label: 'Pending',  count: pending },
              { label: 'Accepted', count: accepted },
              { label: 'Rejected', count: rejected },
            ].map(({ label, count }) => (
              <button
                key={label}
                type="button"
                onClick={() => setFilterStatus(label)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer border
                  ${filterStatus === label
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-input text-gray-400 border-app hover:text-app hover:bg-hover'}`}
              >
                {label} <span className="opacity-70">({count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-gray-500 text-xs border-b border-app">
                <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Shipment ID</th>
                <th className="text-left px-4 py-2.5 font-medium">Partner</th>
                <th className="text-left px-4 py-2.5 font-medium">Pickup</th>
                <th className="text-left px-4 py-2.5 font-medium">Est. delivery</th>
                <th className="text-left px-4 py-2.5 font-medium">Route</th>
                <th className="text-left px-4 py-2.5 font-medium">990</th>
                <th className="text-left px-4 py-2.5 font-medium">Received</th>
                <th className="text-right px-4 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-600 text-sm">No load tenders found.</td></tr>
              )}
              {displayed.map(t => (
                <tr key={t._id} className="border-b border-subtle hover:bg-hover transition">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{t.shipmentId ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-app font-medium whitespace-nowrap">{t.partner?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmt(t.pickupDate)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmt(t.deliveryDate)}</td>
                  <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">{t.route}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtTime(t.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(t)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer border-none whitespace-nowrap
                        ${t.status === 'Pending' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-input hover:bg-white/10 text-gray-400 border border-app'}`}
                    >
                      {t.status === 'Pending' ? 'Respond' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
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
      {toastNode}
    </>
  );
}

export default LoadTenders;
