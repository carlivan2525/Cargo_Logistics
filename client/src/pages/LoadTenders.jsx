import { useState } from 'react';
import { Inbox, Truck, CheckCircle2, XCircle, Clock, ChevronDown, Package } from 'lucide-react';

// Available fleet
const FLEET = [
  { id: 'VH-001', name: 'L300 Van',      type: 'L300',     plate: 'ABC 1234', capacity: '1.5T' },
  { id: 'VH-002', name: 'L300 Van',      type: 'L300',     plate: 'DEF 5678', capacity: '1.5T' },
  { id: 'VH-003', name: 'Truck (10W)',   type: 'Truck',    plate: 'GHI 9012', capacity: '10T'  },
  { id: 'VH-004', name: 'Truck (6W)',    type: 'Truck',    plate: 'JKL 3456', capacity: '6T'   },
  { id: 'VH-005', name: 'Expander Van',  type: 'Expander', plate: 'MNO 7890', capacity: '2T'   },
];

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

const initialTenders = [
  {
    id: 'TND-0001', ediRef: 'TRX-0001', partner: 'RetailCo PH',
    shipmentId: 'SHP-0516-001', route: 'Manila → Cebu',
    pickupDate: 'May 19, 2026', deliveryDate: 'May 21, 2026',
    weight: '4.2T', commodity: 'General Merchandise',
    status: 'Pending', assignedVehicle: null, receivedAt: '09:14',
  },
  {
    id: 'TND-0002', ediRef: 'TRX-0005', partner: 'SupplyMax',
    shipmentId: 'SHP-0516-002', route: 'Batangas → Davao',
    pickupDate: 'May 20, 2026', deliveryDate: 'May 23, 2026',
    weight: '1.2T', commodity: 'Auto Parts',
    status: 'Pending', assignedVehicle: null, receivedAt: '08:30',
  },
  {
    id: 'TND-0003', ediRef: 'TRX-0008', partner: 'MFG Direct',
    shipmentId: 'SHP-0516-004', route: 'Laguna → Pampanga',
    pickupDate: 'May 19, 2026', deliveryDate: 'May 20, 2026',
    weight: '800kg', commodity: 'Electronics',
    status: 'Accepted', assignedVehicle: 'VH-005', receivedAt: '07:55',
  },
];

function VehicleDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = FLEET.find(v => v.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/8 border border-white/10 text-gray-300 hover:bg-white/15 transition cursor-pointer min-w-[160px] justify-between"
      >
        <span className="flex items-center gap-1.5">
          <Truck size={11} className="text-gray-500" />
          {selected ? `${selected.name} · ${selected.plate}` : 'Assign vehicle...'}
        </span>
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-30 bg-[#1a1d2a] border border-white/10 rounded-lg shadow-xl overflow-hidden w-64">
          {FLEET.map(v => (
            <button
              key={v.id}
              onClick={() => { onChange(v.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-xs hover:bg-white/8 transition cursor-pointer border-none flex items-center justify-between
                ${value === v.id ? 'bg-blue-500/10 text-blue-400' : 'text-gray-300'}`}
            >
              <span className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${VEHICLE_TYPE_STYLE[v.type]}`}>{v.type}</span>
                <span>{v.name} · {v.plate}</span>
              </span>
              <span className="text-gray-500">{v.capacity}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TenderDetail({ tender, onClose, onRespond }) {
  const [vehicle, setVehicle] = useState(tender.assignedVehicle);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#13151f] border border-white/10 rounded-2xl w-[520px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Inbox size={15} className="text-blue-400" />
            <span className="font-semibold text-white text-sm">EDI 204 — Load Tender</span>
            <span className="text-xs font-mono text-gray-500">{tender.id}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition cursor-pointer bg-transparent border-none text-lg leading-none">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Partner & EDI ref */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 mb-1">FROM PARTNER</p>
              <p className="text-sm font-semibold text-white">{tender.partner}</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{tender.ediRef}</p>
            </div>
            <div className="bg-white/5 rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 mb-1">SHIPMENT</p>
              <p className="text-sm font-semibold text-white">{tender.shipmentId}</p>
              <p className="text-xs text-gray-500 mt-0.5">{tender.route}</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg px-4 py-3 space-y-2">
              <p className="text-[10px] text-gray-500">PICKUP DATE</p>
              <p className="text-xs text-white">{tender.pickupDate}</p>
              <p className="text-[10px] text-gray-500 mt-1">DELIVERY DATE</p>
              <p className="text-xs text-white">{tender.deliveryDate}</p>
            </div>
            <div className="bg-white/5 rounded-lg px-4 py-3 space-y-2">
              <p className="text-[10px] text-gray-500">WEIGHT</p>
              <p className="text-xs text-white">{tender.weight}</p>
              <p className="text-[10px] text-gray-500 mt-1">COMMODITY</p>
              <p className="text-xs text-white">{tender.commodity}</p>
            </div>
          </div>

          {/* Vehicle assignment */}
          <div className="bg-white/5 rounded-lg px-4 py-3">
            <p className="text-[10px] text-gray-500 mb-2">ASSIGN VEHICLE (990 Response)</p>
            <VehicleDropdown value={vehicle} onChange={setVehicle} />
            {vehicle && (
              <p className="text-[10px] text-green-400 mt-2 flex items-center gap-1">
                <CheckCircle2 size={10} /> Vehicle assigned — ready to send 990 Accepted
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10">
          <button
            onClick={() => onRespond(tender.id, 'Rejected', null)}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition cursor-pointer font-medium"
          >
            <XCircle size={12} /> Send 990 — Rejected
          </button>
          <button
            disabled={!vehicle}
            onClick={() => onRespond(tender.id, 'Accepted', vehicle)}
            className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-medium transition cursor-pointer border-none
              ${vehicle ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}
          >
            <CheckCircle2 size={12} /> Send 990 — Accepted
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadTenders() {
  const [tenders, setTenders] = useState(initialTenders);
  const [selected, setSelected] = useState(null);

  const pending  = tenders.filter(t => t.status === 'Pending').length;
  const accepted = tenders.filter(t => t.status === 'Accepted').length;
  const rejected = tenders.filter(t => t.status === 'Rejected').length;

  const handleRespond = (id, status, vehicleId) => {
    setTenders(prev => prev.map(t => t.id === id ? { ...t, status, assignedVehicle: vehicleId } : t));
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending 204s',  value: pending,  icon: Clock,         color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Accepted',      value: accepted, icon: CheckCircle2,  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Rejected',      value: rejected, icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl p-4 border ${bg} flex items-center gap-3`}>
            <Icon size={18} className={color} />
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#13151f] rounded-xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Inbox size={14} className="text-gray-400" />
            <span className="font-semibold text-sm text-white">Incoming Load Tenders (EDI 204)</span>
            {pending > 0 && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pending} awaiting response</span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-white/10">
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
              {tenders.map(t => {
                const vehicle = FLEET.find(v => v.id === t.assignedVehicle);
                return (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{t.id}</td>
                    <td className="px-5 py-3 text-xs text-white font-medium">{t.partner}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{t.shipmentId}</td>
                    <td className="px-5 py-3 text-xs text-gray-300">{t.route}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{t.pickupDate}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{t.weight}</td>
                    <td className="px-5 py-3">
                      {vehicle ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${VEHICLE_TYPE_STYLE[vehicle.type]}`}>
                          {vehicle.type} · {vehicle.plate}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{t.receivedAt}</td>
                    <td className="px-5 py-3 text-right">
                      {t.status === 'Pending' ? (
                        <button
                          onClick={() => setSelected(t)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer border-none"
                        >
                          Respond
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelected(t)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition cursor-pointer border border-white/10"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <TenderDetail
          tender={selected}
          onClose={() => setSelected(null)}
          onRespond={handleRespond}
        />
      )}
    </div>
  );
}

export default LoadTenders;
