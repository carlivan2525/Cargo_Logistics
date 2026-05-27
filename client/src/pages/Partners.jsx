import { useState, useEffect } from 'react';
import { Globe, Search, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../api';

const TYPE_STYLE = {
  'Retailer':     'bg-blue-500/20 text-blue-400',
  'Manufacturer': 'bg-purple-500/20 text-purple-400',
  'Supplier':     'bg-orange-500/20 text-orange-400',
  'Customer':     'bg-green-500/20 text-green-400',
};

function Partners() {
  const [partners, setPartners] = useState([]);
  const [search, setSearch]     = useState('');
  const [filterType, setFilterType] = useState('All');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/partners')
      .then(setPartners)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = partners.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.isaId.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'All' || p.type === filterType;
    return matchSearch && matchType;
  });

  if (loading) return <div className="text-gray-500 text-sm py-10 text-center">Loading...</div>;

  return (
    <div className="bg-card rounded-xl border border-app overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-app">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-gray-400" />
          <span className="font-semibold text-sm text-app">Trading Partners</span>
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
            {partners.filter(p => p.status === 'Active').length} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-input border border-app rounded-lg px-3 py-1.5">
            <Search size={12} className="text-gray-500" />
            <input type="text" placeholder="Search partners..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-36" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="bg-input border border-app text-xs text-gray-300 rounded-lg px-2 py-1.5 outline-none cursor-pointer">
            <option value="All">All Types</option>
            {['Retailer','Manufacturer','Supplier','Customer'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-app">
              <th className="text-left px-5 py-2.5 font-medium">Partner ID</th>
              <th className="text-left px-5 py-2.5 font-medium">Name</th>
              <th className="text-left px-5 py-2.5 font-medium">Type</th>
              <th className="text-left px-5 py-2.5 font-medium">ISA ID</th>
              <th className="text-left px-5 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p._id} className="border-b border-subtle hover:bg-hover transition">
                <td className="px-5 py-3 font-mono text-xs text-gray-400">{p.partnerId}</td>
                <td className="px-5 py-3 text-sm text-app font-medium">{p.name}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_STYLE[p.type]}`}>{p.type}</span>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-gray-400">{p.isaId}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    {p.status === 'Active'
                      ? <CheckCircle2 size={12} className="text-green-400" />
                      : <XCircle size={12} className="text-red-400" />}
                    <span className={`text-xs ${p.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>{p.status}</span>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-600 text-sm">No partners found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Partners;
