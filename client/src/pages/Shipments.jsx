import { useState } from 'react';
import { Truck, CheckCircle2, Clock, Package, ChevronDown } from 'lucide-react';

const STATUS_OPTIONS = ['Pending', 'Pickup', 'In Transit', 'Delivered', 'Exception'];

const STATUS_STYLE = {
  'Pending':    'bg-gray-500/20 text-gray-400',
  'Pickup':     'bg-yellow-500/20 text-yellow-400',
  'In Transit': 'bg-blue-500/20 text-blue-400',
  'Delivered':  'bg-green-500/20 text-green-400',
  'Exception':  'bg-red-500/20 text-red-400',
};

// 214 is sent on Pickup, In Transit, and Delivered
const EDI_214_STATUSES = ['Pickup', 'In Transit', 'Delivered'];

const EDI_214_LABEL = {
  'Pickup':     'Pickup',
  'In Transit': 'In Transit',
  'Delivered':  'Delivered',
};

const MILESTONES = [
  { key: 'Pending',    icon: Clock,        label: 'Pending' },
  { key: 'Pickup',     icon: Package,      label: 'Pickup' },
  { key: 'In Transit', icon: Truck,        label: 'In Transit' },
  { key: 'Delivered',  icon: CheckCircle2, label: 'Delivered' },
];

const MILESTONE_ORDER = ['Pending', 'Pickup', 'In Transit', 'Delivered'];

const initialShipments = [
  { id: 'SHP-0516-001', route: 'Manila → Cebu',    company: 'RetailCo PH', status: 'In Transit', ediSent: true  },
  { id: 'SHP-0516-002', route: 'Batangas → Davao', company: 'SupplyMax',   status: 'Pickup',     ediSent: true  },
  { id: 'SHP-0516-003', route: 'Laguna → QC',      company: 'MFG Direct',  status: 'Delivered',  ediSent: true  },
];

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
                        : 'bg-white/5 text-gray-600'}`}>
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

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer border-none"
      >
        Update Status <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-[#1a1d2a] border border-white/10 rounded-lg shadow-xl overflow-hidden w-44">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-white/8 transition cursor-pointer border-none
                ${value === s ? 'text-blue-400 bg-blue-500/10' : 'text-gray-300'}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ShipmentsTable() {
  const [shipments, setShipments] = useState(initialShipments);

  const updateStatus = (id, newStatus) => {
    setShipments(prev => prev.map(s =>
      s.id === id
        ? { ...s, status: newStatus, ediSent: EDI_214_STATUSES.includes(newStatus) }
        : s
    ));
  };

  return (
    <div className="bg-[#13151f] rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-gray-400" />
          <span className="font-semibold text-sm text-white">Shipments</span>
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
            {shipments.filter(s => s.status === 'In Transit').length} in transit
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-white/10">
              <th className="text-left px-5 py-2.5 font-medium">Shipment ID</th>
              <th className="text-left px-5 py-2.5 font-medium">Route</th>
              <th className="text-left px-5 py-2.5 font-medium">Current Milestone</th>
              <th className="text-left px-5 py-2.5 font-medium">Status</th>
              <th className="text-left px-5 py-2.5 font-medium">EDI</th>
              <th className="text-right px-5 py-2.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition">
                {/* Shipment ID */}
                <td className="px-5 py-3.5 font-mono text-xs text-gray-400">{s.id}</td>

                {/* Route */}
                <td className="px-5 py-3.5">
                  <p className="text-xs font-medium text-white">{s.route}</p>
                  <p className="text-xs text-gray-500">{s.company}</p>
                </td>

                {/* Milestone Tracker */}
                <td className="px-5 py-3.5">
                  <MilestoneTracker status={s.status} />
                </td>

                {/* Status Badge */}
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[s.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                    {s.status}
                  </span>
                </td>

                {/* EDI 214 Tag */}
                <td className="px-5 py-3.5">
                  {s.ediSent ? (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 font-medium w-fit">
                      <CheckCircle2 size={10} />
                      214 · {EDI_214_LABEL[s.status] ?? s.status}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </td>

                {/* Action */}
                <td className="px-5 py-3.5 text-right">
                  <StatusDropdown value={s.status} onChange={(val) => updateStatus(s.id, val)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ShipmentsTable;
