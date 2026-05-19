import { useState } from 'react';
import { Database, Search, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const LEVEL_STYLE = {
  'INFO':  'bg-blue-500/20 text-blue-400',
  'OK':    'bg-green-500/20 text-green-400',
  'WARN':  'bg-yellow-500/20 text-yellow-400',
  'ERROR': 'bg-red-500/20 text-red-400',
};

const LEVEL_ICON = {
  'INFO':  Info,
  'OK':    CheckCircle2,
  'WARN':  AlertTriangle,
  'ERROR': AlertTriangle,
};

const logs = [
  { id: 1, time: '09:14:02', level: 'OK',    ediCode: '204', partner: 'RetailCo PH', message: 'Load tender received — Accepted', isa: 'ISA*00*...*ZZ*RETAILCO*20260517*0914*^*00501*000000001*0*P*>' },
  { id: 2, time: '09:18:44', level: 'OK',    ediCode: '990', partner: 'RetailCo PH', message: 'Acknowledgment sent — Accepted',   isa: 'ISA*00*...*ZZ*CARGO*20260517*0918*^*00501*000000002*0*P*>' },
  { id: 3, time: '10:02:11', level: 'OK',    ediCode: '214', partner: 'RetailCo PH', message: 'Shipment status sent — Pickup',    isa: 'ISA*00*...*ZZ*CARGO*20260517*1002*^*00501*000000003*0*P*>' },
  { id: 4, time: '11:45:00', level: 'OK',    ediCode: '210', partner: 'RetailCo PH', message: 'Invoice sent successfully',        isa: 'ISA*00*...*ZZ*CARGO*20260517*1145*^*00501*000000004*0*P*>' },
  { id: 5, time: '09:50:33', level: 'ERROR', ediCode: '214', partner: 'SupplyMax',   message: 'Transmission failed — Connection timeout', isa: 'ISA*00*...*ZZ*SUPPLYMAX*20260517*0950*^*00501*000000005*0*P*>' },
];

function EdiLogs() {
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const filtered = logs.filter(l => {
    const matchSearch = l.partner.toLowerCase().includes(search.toLowerCase()) ||
      l.message.toLowerCase().includes(search.toLowerCase()) ||
      l.ediCode.includes(search);
    const matchLevel = filterLevel === 'All' || l.level === filterLevel;
    return matchSearch && matchLevel;
  });

  return (
    <div className="bg-[#13151f] rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-gray-400" />
          <span className="font-semibold text-sm text-white">EDI Logs</span>
          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
            {logs.filter(l => l.level === 'ERROR').length} errors
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            <Search size={12} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-36"
            />
          </div>
          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="bg-white/5 border border-white/10 text-xs text-gray-300 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
          >
            <option value="All">All Levels</option>
            {['OK','INFO','WARN','ERROR'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Log list */}
      <div className="font-mono text-xs divide-y divide-white/5 overflow-y-auto max-h-[600px]">
        {filtered.map(log => {
          const Icon = LEVEL_ICON[log.level];
          const isExpanded = expanded === log.id;
          return (
            <div
              key={log.id}
              className="hover:bg-white/5 transition cursor-pointer"
              onClick={() => setExpanded(isExpanded ? null : log.id)}
            >
              <div className="flex items-start gap-3 px-5 py-3">
                <Icon size={13} className={
                  log.level === 'OK' ? 'text-green-400 mt-0.5' :
                  log.level === 'INFO' ? 'text-blue-400 mt-0.5' :
                  log.level === 'WARN' ? 'text-yellow-400 mt-0.5' :
                  'text-red-400 mt-0.5'
                } />
                <span className="text-gray-600 w-20 flex-shrink-0">{log.time}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold w-12 text-center flex-shrink-0 ${LEVEL_STYLE[log.level]}`}>
                  {log.level}
                </span>
                <span className="text-blue-400 w-8 flex-shrink-0">{log.ediCode}</span>
                <span className="text-purple-400 w-28 flex-shrink-0 truncate">{log.partner}</span>
                <span className="text-gray-300 flex-1">{log.message}</span>
              </div>
              {isExpanded && log.isa && (
                <div className="px-5 pb-3 ml-10">
                  <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-gray-400 text-[11px] break-all">
                    {log.isa}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-600">No logs found.</div>
        )}
      </div>
    </div>
  );
}

export default EdiLogs;
