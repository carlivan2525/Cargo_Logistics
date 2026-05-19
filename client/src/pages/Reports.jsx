import { BarChart2, TrendingUp, Package, FileText, ArrowUpDown, Download } from 'lucide-react';

const monthlyShipments = [
  { month: 'Jan', count: 820 },
  { month: 'Feb', count: 940 },
  { month: 'Mar', count: 1080 },
  { month: 'Apr', count: 1150 },
  { month: 'May', count: 1284 },
];

const topPartners = [
  { name: 'RetailCo PH', shipments: 312, revenue: '₱4.2M', edi: 1248 },
  { name: 'SupplyMax',   shipments: 248, revenue: '₱3.1M', edi: 992  },
  { name: 'MFG Direct',  shipments: 196, revenue: '₱2.8M', edi: 784  },
];

const ediSummary = [
  { code: '204', label: 'Load Tender',   sent: 0,   received: 312, ack: 312 },
  { code: '990', label: 'LT Response',   sent: 312, received: 0,   ack: 0   },
  { code: '214', label: 'Ship Status',   sent: 284, received: 0,   ack: 0   },
  { code: '210', label: 'Invoice',       sent: 248, received: 0,   ack: 240 },
];

const maxCount = Math.max(...monthlyShipments.map(m => m.count));

function Reports() {
  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Package,     label: 'Total Shipments', value: '1,284', sub: '+12% vs last month', color: 'text-blue-400' },
          { icon: ArrowUpDown, label: 'EDI Docs Sent',   value: '844',   sub: 'This month',         color: 'text-purple-400' },
          { icon: FileText,    label: 'Invoices Issued', value: '248',   sub: '₱12.4M total',       color: 'text-green-400' },
          { icon: TrendingUp,  label: 'On-time Rate',    value: '94.2%', sub: '+1.8% vs last month',color: 'text-orange-400' },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="bg-card rounded-xl p-4 border border-app">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
              <Icon size={13} className={color} />
              <span>{label}</span>
            </div>
            <p className="text-3xl font-bold text-app">{value}</p>
            <p className="text-xs mt-1 text-gray-500">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Bar chart */}
        <div className="col-span-2 bg-card rounded-xl border border-app p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={14} className="text-gray-400" />
              <span className="text-sm font-semibold text-app">Monthly Shipments</span>
            </div>
            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-app transition cursor-pointer bg-transparent border-none">
              <Download size={12} /> Export
            </button>
          </div>
          <div className="flex items-end gap-3 h-36">
            {monthlyShipments.map(m => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500">{m.count}</span>
                <div
                  className="w-full bg-blue-600 rounded-t-sm transition-all"
                  style={{ height: `${(m.count / maxCount) * 100}%` }}
                />
                <span className="text-[10px] text-gray-500">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top partners */}
        <div className="col-span-3 bg-card rounded-xl border border-app overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-app">
            <span className="text-sm font-semibold text-app">Top Partners</span>
            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-app transition cursor-pointer bg-transparent border-none">
              <Download size={12} /> Export
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-app">
                <th className="text-left px-5 py-2.5 font-medium">Partner</th>
                <th className="text-left px-5 py-2.5 font-medium">Shipments</th>
                <th className="text-left px-5 py-2.5 font-medium">Revenue</th>
                <th className="text-left px-5 py-2.5 font-medium">EDI Docs</th>
              </tr>
            </thead>
            <tbody>
              {topPartners.map(p => (
                <tr key={p.name} className="border-b border-subtle hover:bg-hover transition">
                  <td className="px-5 py-3 text-sm text-app font-medium">{p.name}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{p.shipments}</td>
                  <td className="px-5 py-3 text-xs text-green-400 font-semibold">{p.revenue}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{p.edi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDI summary */}
      <div className="bg-card rounded-xl border border-app overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-app">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-gray-400" />
            <span className="text-sm font-semibold text-app">EDI Document Summary</span>
          </div>
          <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-app transition cursor-pointer bg-transparent border-none">
            <Download size={12} /> Export
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-app">
              <th className="text-left px-5 py-2.5 font-medium">EDI Code</th>
              <th className="text-left px-5 py-2.5 font-medium">Document Type</th>
              <th className="text-left px-5 py-2.5 font-medium">Sent</th>
              <th className="text-left px-5 py-2.5 font-medium">Received</th>
              <th className="text-left px-5 py-2.5 font-medium">Acknowledged</th>
            </tr>
          </thead>
          <tbody>
            {ediSummary.map(e => (
              <tr key={e.code} className="border-b border-subtle hover:bg-hover transition">
                <td className="px-5 py-3">
                  <span className="text-xs font-bold text-app bg-white/10 px-2 py-0.5 rounded font-mono">{e.code}</span>
                </td>
                <td className="px-5 py-3 text-xs text-gray-300">{e.label}</td>
                <td className="px-5 py-3 text-xs text-blue-400">{e.sent || '—'}</td>
                <td className="px-5 py-3 text-xs text-green-400">{e.received || '—'}</td>
                <td className="px-5 py-3 text-xs text-purple-400">{e.ack || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Reports;
