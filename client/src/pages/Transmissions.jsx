import { useState, useEffect } from 'react';
import { ArrowUpDown, Send, Search, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api';
import { usePolling } from '../hooks/usePolling';

const STATUS_STYLE = {
  'Sent':     'bg-green-500/20 text-green-400',
  'Received': 'bg-blue-500/20 text-blue-400',
  'Failed':   'bg-red-500/20 text-red-400',
  'Pending':  'bg-yellow-500/20 text-yellow-400',
};

function Transmissions() {
  const [data, setData]                   = useState([]);
  const [total, setTotal]                 = useState(0);
  const [pages, setPages]                 = useState(1);
  const [page, setPage]                   = useState(1);
  const [search, setSearch]               = useState('');
  const [filterDir, setFilterDir]         = useState('All');
  const [filterStatus, setFilterStatus]   = useState('All');
  const [loading, setLoading]             = useState(true);

  const load = async (p = 1, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`/transmissions?page=${p}`);
      setData(res.data);
      setTotal(res.total);
      setPages(res.pages);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);
  usePolling(() => load(page, true));

  const filtered = data.filter(t => {
    const matchSearch =
      t.transmissionId?.toLowerCase().includes(search.toLowerCase()) ||
      t.partner?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.ediCode?.includes(search);
    const matchDir    = filterDir    === 'All' || t.direction === filterDir;
    const matchStatus = filterStatus === 'All' || t.status    === filterStatus;
    return matchSearch && matchDir && matchStatus;
  });

  const fmtDateTime = d => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' }) + ' ' +
           dt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total',    value: total,                                        icon: ArrowUpDown, color: 'text-blue-400',  bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Sent',     value: data.filter(t => t.status==='Sent').length,    icon: Send,        color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Received', value: data.filter(t => t.status==='Received').length,icon: ArrowUpDown, color: 'text-purple-400',bg: 'bg-purple-500/10 border-purple-500/20' },
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
            <ArrowUpDown size={14} className="text-gray-400" />
            <span className="font-semibold text-sm text-app">EDI Transmissions</span>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{total} total</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-input border border-app rounded-lg px-3 py-1.5">
              <Search size={12} className="text-gray-500" />
              <input type="text" placeholder="Search..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-32" />
            </div>
            <select value={filterDir} onChange={e => setFilterDir(e.target.value)}
              className="bg-input border border-app text-xs text-gray-300 rounded-lg px-2 py-1.5 outline-none cursor-pointer">
              <option value="All">All Direction</option>
              <option value="IN">Inbound</option>
              <option value="OUT">Outbound</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-input border border-app text-xs text-gray-300 rounded-lg px-2 py-1.5 outline-none cursor-pointer">
              <option value="All">All Status</option>
              {['Sent','Received','Failed','Pending'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-app">
                <th className="text-left px-5 py-2.5 font-medium">ID</th>
                <th className="text-left px-5 py-2.5 font-medium">EDI Code</th>
                <th className="text-left px-5 py-2.5 font-medium">Type</th>
                <th className="text-left px-5 py-2.5 font-medium">Direction</th>
                <th className="text-left px-5 py-2.5 font-medium">Partner</th>
                <th className="text-left px-5 py-2.5 font-medium">Shipment</th>
                <th className="text-left px-5 py-2.5 font-medium">Date & Time</th>
                <th className="text-left px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-600 text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-600 text-sm">No transmissions found.</td></tr>
              ) : filtered.map(t => (
                <tr key={t._id} className="border-b border-subtle hover:bg-hover transition">
                  <td className="px-5 py-3 font-mono text-xs text-gray-400">{t.transmissionId}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-bold text-app bg-white/10 px-2 py-0.5 rounded">{t.ediCode}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-300">{t.label}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium
                      ${t.direction === 'OUT' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                      {t.direction === 'OUT' ? '↑ OUT' : '↓ IN'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-app">{t.partner?.name}</td>
                  <td className="px-5 py-3 text-xs text-gray-400 font-mono">{t.shipment?.shipmentId ?? '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{fmtDateTime(t.createdAt)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-app">
            <span className="text-xs text-gray-500">Page {page} of {pages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => load(page - 1)} disabled={page === 1}
                className="p-1.5 rounded-lg bg-input border border-app text-gray-400 hover:text-app disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition">
                <ChevronLeft size={13} />
              </button>
              <button onClick={() => load(page + 1)} disabled={page === pages}
                className="p-1.5 rounded-lg bg-input border border-app text-gray-400 hover:text-app disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Transmissions;
