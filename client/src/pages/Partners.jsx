import { useState } from 'react';
import { Globe, Plus, Search, CheckCircle2, XCircle, Edit2 } from 'lucide-react';

const initialPartners = [
  { id: 'PTR-001', name: 'RetailCo PH', type: 'Customer', isa: 'RETAILCO',  protocol: 'AS2',  status: 'Active',   docs: ['204','990','856','214','210'] },
  { id: 'PTR-002', name: 'SupplyMax',   type: 'Customer', isa: 'SUPPLYMAX', protocol: 'SFTP', status: 'Active',   docs: ['204','856','214'] },
  { id: 'PTR-003', name: 'MFG Direct',  type: 'Supplier', isa: 'MFGDIRECT', protocol: 'AS2',  status: 'Inactive', docs: ['856','210','997'] },
];

const TYPE_STYLE = {
  'Customer': 'bg-blue-500/20 text-blue-400',
  'Supplier': 'bg-purple-500/20 text-purple-400',
  'Carrier':  'bg-orange-500/20 text-orange-400',
};

function Partners() {
  const [partners] = useState(initialPartners);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');

  const filtered = partners.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.isa.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'All' || p.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="bg-[#13151f] rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-gray-400" />
          <span className="font-semibold text-sm text-white">Trading Partners</span>
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
            {partners.filter(p => p.status === 'Active').length} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            <Search size={12} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search partners..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-36"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-white/5 border border-white/10 text-xs text-gray-300 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
          >
            <option value="All">All Types</option>
            {['Customer','Supplier','Carrier'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition cursor-pointer border-none font-medium">
            <Plus size={12} /> Add Partner
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-white/10">
              <th className="text-left px-5 py-2.5 font-medium">Partner ID</th>
              <th className="text-left px-5 py-2.5 font-medium">Name</th>
              <th className="text-left px-5 py-2.5 font-medium">Type</th>
              <th className="text-left px-5 py-2.5 font-medium">ISA ID</th>
              <th className="text-left px-5 py-2.5 font-medium">Protocol</th>
              <th className="text-left px-5 py-2.5 font-medium">EDI Docs</th>
              <th className="text-left px-5 py-2.5 font-medium">Status</th>
              <th className="text-right px-5 py-2.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="px-5 py-3 font-mono text-xs text-gray-400">{p.id}</td>
                <td className="px-5 py-3 text-sm text-white font-medium">{p.name}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_STYLE[p.type]}`}>{p.type}</span>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-gray-400">{p.isa}</td>
                <td className="px-5 py-3 text-xs text-gray-300">{p.protocol}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.docs.map(d => (
                      <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono">{d}</span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    {p.status === 'Active'
                      ? <CheckCircle2 size={12} className="text-green-400" />
                      : <XCircle size={12} className="text-red-400" />}
                    <span className={`text-xs ${p.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>{p.status}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition cursor-pointer bg-transparent border-none ml-auto">
                    <Edit2 size={12} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-600 text-sm">No partners found.</div>
        )}
      </div>
    </div>
  );
}

export default Partners;
