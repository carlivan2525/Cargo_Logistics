import { useState } from 'react';
import { FileText, Search, Plus, Download, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const STATUS_STYLE = {
  'Paid':     'bg-green-500/20 text-green-400',
  'Pending':  'bg-yellow-500/20 text-yellow-400',
  'Overdue':  'bg-red-500/20 text-red-400',
  'Draft':    'bg-gray-500/20 text-gray-400',
};

const initialInvoices = [
  { id: 'INV-2026-0041', customer: 'RetailCo PH', shipment: 'SHP-0516-001', amount: '₱128,400', due: 'May 20, 2026', status: 'Pending', edi: '210' },
  { id: 'INV-2026-0040', customer: 'MFG Direct',  shipment: 'SHP-0516-003', amount: '₱87,500',  due: 'May 18, 2026', status: 'Paid',    edi: '210' },
  { id: 'INV-2026-0039', customer: 'SupplyMax',   shipment: 'SHP-0516-002', amount: '₱44,200',  due: 'May 17, 2026', status: 'Overdue', edi: '210' },
];

function Invoices() {
  const [invoices] = useState(initialInvoices);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const filtered = invoices.filter(inv => {
    const matchSearch = inv.id.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const overdue = invoices.filter(i => i.status === 'Overdue').length;
  const pending = invoices.filter(i => i.status === 'Pending').length;
  const paid    = invoices.filter(i => i.status === 'Paid').length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Overdue', value: overdue, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Pending', value: pending, icon: Clock,         color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Paid',    value: paid,    icon: CheckCircle2,  color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl p-4 border ${bg} flex items-center gap-3`}>
            <Icon size={18} className={color} />
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-400">{label} invoices</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#13151f] rounded-xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-gray-400" />
            <span className="font-semibold text-sm text-white">Invoices</span>
            {overdue > 0 && (
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{overdue} overdue</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <Search size={12} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-36"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white/5 border border-white/10 text-xs text-gray-300 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
            >
              <option value="All">All Status</option>
              {['Paid','Pending','Overdue','Draft'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition cursor-pointer border-none font-medium">
              <Plus size={12} /> New Invoice
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-white/10">
                <th className="text-left px-5 py-2.5 font-medium">Invoice ID</th>
                <th className="text-left px-5 py-2.5 font-medium">Customer</th>
                <th className="text-left px-5 py-2.5 font-medium">Shipment</th>
                <th className="text-left px-5 py-2.5 font-medium">Amount</th>
                <th className="text-left px-5 py-2.5 font-medium">Due Date</th>
                <th className="text-left px-5 py-2.5 font-medium">EDI</th>
                <th className="text-left px-5 py-2.5 font-medium">Status</th>
                <th className="text-right px-5 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-5 py-3 font-mono text-xs text-gray-400">{inv.id}</td>
                  <td className="px-5 py-3 text-sm text-white font-medium">{inv.customer}</td>
                  <td className="px-5 py-3 text-xs text-gray-400 font-mono">{inv.shipment}</td>
                  <td className="px-5 py-3 text-xs text-white font-semibold">{inv.amount}</td>
                  <td className={`px-5 py-3 text-xs ${inv.status === 'Overdue' ? 'text-red-400 font-medium' : 'text-gray-500'}`}>{inv.due}</td>
                  <td className="px-5 py-3">
                    {inv.edi
                      ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">EDI {inv.edi}</span>
                      : <span className="text-xs text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[inv.status]}`}>{inv.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition cursor-pointer bg-transparent border-none ml-auto">
                      <Download size={12} /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-600 text-sm">No invoices found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Invoices;
