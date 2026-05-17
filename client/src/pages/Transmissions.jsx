import { useState } from 'react';
import { ArrowUpDown, Send, Search, CheckCircle2, XCircle, Clock } from 'lucide-react';

const STATUS_STYLE = {
  'Sent':    'bg-green-500/20 text-green-400',
  'Received':'bg-blue-500/20 text-blue-400',
  'Failed':  'bg-red-500/20 text-red-400',
  'Pending': 'bg-yellow-500/20 text-yellow-400',
};

const initialTransmissions = [
  { id: 'TRX-0001', ediCode: '204', label: 'Load Tender', dir: 'OUT', partner: 'RetailCo PH', shipment: 'SHP-0516-001', time: '09:14', status: 'Sent' },
  { id: 'TRX-0002', ediCode: '990', label: 'LT Response', dir: 'IN',  partner: 'RetailCo PH', shipment: 'SHP-0516-001', time: '09:18', status: 'Received' },
  { id: 'TRX-0003', ediCode: '856', label: 'Ship Notice', dir: 'OUT', partner: 'SupplyMax',   shipment: 'SHP-0516-002', time: '10:02', status: 'Failed' },
];

function Transmissions() {
  const [search, setSearch] = useState('');
  const [filterDir, setFilterDir] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const filtered = initialTransmissions.filter(t => {
    const matchSearch = t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.partner.toLowerCase().includes(search.toLowerCase()) ||
      t.ediCode.includes(search);
    const matchDir = filterDir === 'All' || t.dir === filterDir;
    const matchStatus = filterStatus === 'All' || t.status === filterStatus;
    return matchSearch && matchDir && matchStatus;
  });

  const sent     = initialTransmissions.filter(t => t.status === 'Sent').length;
  const received = initialTransmissions.filter(t => t.status === 'Received').length;
  const failed   = initialTransmissions.filter(t => t.status === 'Failed').length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sent',     value: sent,     icon: Send,         color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Received', value: received, icon: ArrowUpDown,  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Failed',   value: failed,   icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
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
            <ArrowUpDown size={14} className="text-gray-400" />
            <span className="font-semibold text-sm text-white">EDI Transmissions</span>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
              {initialTransmissions.length} total today
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <Search size={12} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-32"
              />
            </div>
            <select
              value={filterDir}
              onChange={e => setFilterDir(e.target.value)}
              className="bg-white/5 border border-white/10 text-xs text-gray-300 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
            >
              <option value="All">All Direction</option>
              <option value="IN">Inbound</option>
              <option value="OUT">Outbound</option>
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white/5 border border-white/10 text-xs text-gray-300 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
            >
              <option value="All">All Status</option>
              {['Sent','Received','Failed','Pending'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition cursor-pointer border-none font-medium">
              <Send size={12} /> Transmit EDI
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-white/10">
                <th className="text-left px-5 py-2.5 font-medium">ID</th>
                <th className="text-left px-5 py-2.5 font-medium">EDI Code</th>
                <th className="text-left px-5 py-2.5 font-medium">Type</th>
                <th className="text-left px-5 py-2.5 font-medium">Direction</th>
                <th className="text-left px-5 py-2.5 font-medium">Partner</th>
                <th className="text-left px-5 py-2.5 font-medium">Shipment</th>
                <th className="text-left px-5 py-2.5 font-medium">Time</th>
                <th className="text-left px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-5 py-3 font-mono text-xs text-gray-400">{t.id}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded">{t.ediCode}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-300">{t.label}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium
                      ${t.dir === 'OUT' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                      {t.dir === 'OUT' ? '↑ OUT' : '↓ IN'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-white">{t.partner}</td>
                  <td className="px-5 py-3 text-xs text-gray-400 font-mono">{t.shipment}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{t.time}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-600 text-sm">No transmissions found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Transmissions;
