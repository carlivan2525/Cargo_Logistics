import { useState } from 'react';
import { ShoppingCart, Plus, Search, ChevronDown, CheckCircle2, Clock, XCircle } from 'lucide-react';

const STATUS_STYLE = {
  'Pending':    'bg-yellow-500/20 text-yellow-400',
  'Confirmed':  'bg-blue-500/20 text-blue-400',
  'Shipped':    'bg-purple-500/20 text-purple-400',
  'Delivered':  'bg-green-500/20 text-green-400',
  'Cancelled':  'bg-red-500/20 text-red-400',
};

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

const initialOrders = [
  { id: 'ORD-2026-0001', customer: 'RetailCo PH', items: 24, total: '₱128,400', date: 'May 16, 2026', status: 'Shipped' },
  { id: 'ORD-2026-0002', customer: 'SupplyMax',   items: 8,  total: '₱44,200',  date: 'May 16, 2026', status: 'Confirmed' },
  { id: 'ORD-2026-0003', customer: 'MFG Direct',  items: 15, total: '₱87,500',  date: 'May 15, 2026', status: 'Delivered' },
];

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white/8 border border-white/10 text-gray-300 hover:bg-white/15 transition cursor-pointer"
      >
        {value} <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-[#1a1d2a] border border-white/10 rounded-lg shadow-xl overflow-hidden w-36">
          {STATUS_OPTIONS.map(s => (
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

function Orders() {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const updateStatus = (id, status) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const filtered = orders.filter(o => {
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="bg-[#13151f] rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShoppingCart size={14} className="text-gray-400" />
          <span className="font-semibold text-sm text-white">Orders</span>
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
            {orders.filter(o => o.status === 'Pending').length} pending
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            <Search size={12} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search orders..."
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
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition cursor-pointer border-none font-medium">
            <Plus size={12} /> New Order
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-white/10">
              <th className="text-left px-5 py-2.5 font-medium">Order ID</th>
              <th className="text-left px-5 py-2.5 font-medium">Customer</th>
              <th className="text-left px-5 py-2.5 font-medium">Items</th>
              <th className="text-left px-5 py-2.5 font-medium">Total</th>
              <th className="text-left px-5 py-2.5 font-medium">Date</th>
              <th className="text-left px-5 py-2.5 font-medium">Status</th>
              <th className="text-right px-5 py-2.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="px-5 py-3 font-mono text-xs text-gray-400">{o.id}</td>
                <td className="px-5 py-3 text-sm text-white font-medium">{o.customer}</td>
                <td className="px-5 py-3 text-xs text-gray-400">{o.items} items</td>
                <td className="px-5 py-3 text-xs text-white font-semibold">{o.total}</td>
                <td className="px-5 py-3 text-xs text-gray-500">{o.date}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[o.status]}`}>{o.status}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <StatusDropdown value={o.status} onChange={val => updateStatus(o.id, val)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-600 text-sm">No orders found.</div>
        )}
      </div>
    </div>
  );
}

export default Orders;
