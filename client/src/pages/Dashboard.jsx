import { useState } from 'react';
import {
  LayoutDashboard, Truck, FileText, Inbox,
  ArrowUpDown, Globe, Settings as SettingsIcon,
  Search, Bell, RefreshCw, Send, MoreHorizontal,
  LogOut, CheckCircle2, AlertTriangle, Package, FileCheck
} from 'lucide-react';
import logo from '../assets/CarGO-logo.png';
import ShipmentsTable from './Shipments';
import Invoices from './Invoices';
import Transmissions from './Transmissions';
import Partners from './Partners';
import Settings from './Settings';
import LoadTenders from './LoadTenders';

const navSections = [
  {
    title: 'MAIN',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard' },
      { icon: Inbox,           label: 'Load Tenders', badgeYellow: 2 },
      { icon: Truck,           label: 'Shipments',    badge: 12 },
      { icon: FileText,        label: 'Invoices',     badgeRed: 3 },
    ],
  },
  {
    title: 'EDI',
    items: [
      { icon: ArrowUpDown, label: 'Transmissions' },
      { icon: Globe,       label: 'Partners' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { icon: SettingsIcon, label: 'Settings' },
    ],
  },
];

const statCards = [
  { icon: Truck,        label: 'Active Shipments', value: '1,284', sub: '+12% this week',   subColor: 'text-green-400' },
  { icon: ArrowUpDown,  label: '204 Received',     value: '47',    sub: 'Load tenders in',  subColor: 'text-gray-400' },
  { icon: FileCheck,    label: '214 Sent',          value: '312',   sub: 'Status updates',   subColor: 'text-gray-400' },
  { icon: AlertTriangle,label: 'Exceptions',        value: '9',     sub: 'Requires review',  subColor: 'text-red-400', valueColor: 'text-red-400' },
];

const shipments = [
  { id: 'SHP-0516-001', route: 'Manila → Cebu',    company: 'RetailCo PH', status: 'In transit',      statusColor: 'bg-blue-500/20 text-blue-400' },
  { id: 'SHP-0516-002', route: 'Batangas → Davao', company: 'SupplyMax',   status: 'Out for delivery', statusColor: 'bg-orange-500/20 text-orange-400' },
  { id: 'SHP-0516-003', route: 'Laguna → QC',      company: 'MFG Direct',  status: 'Delivered',        statusColor: 'bg-green-500/20 text-green-400' },
];

const ediPipeline = [
  { code: '204', label: 'Load Tender',  dir: 'IN',  desc: 'Received from RetailCo PH', time: '09:14' },
  { code: '990', label: 'LT Response',  dir: 'OUT', desc: 'Acknowledged — Accepted',    time: '09:18' },
  { code: '214', label: 'Ship Status',  dir: 'OUT', desc: 'Pickup confirmed',            time: '10:02' },
  { code: '210', label: 'Invoice',      dir: 'OUT', desc: 'Invoice sent to RetailCo PH', time: '11:45' },
];

function Dashboard({ user, onLogout }) {
  const [activeNav, setActiveNav] = useState('Dashboard');

  return (
    <div className="flex h-screen w-screen bg-[#0f1117] text-white overflow-hidden">

      {/* Sidebar */}
      <aside className="w-60 min-w-[240px] bg-[#13151f] flex flex-col border-r border-white/10">

        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <img src={logo} alt="CarGO Logo" className="h-12 w-auto object-contain" />
          <p className="text-sm font-bold text-white">CarGO</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navSections.map(({ title, items }) => (
            <div key={title}>
              <p className="text-[10px] font-semibold text-gray-500 tracking-widest px-2 mb-1.5">{title}</p>
              <ul className="space-y-0.5">
                {items.map(({ icon: Icon, label, badge, badgeRed, badgeYellow }) => (
                  <li key={label}>
                    <button
                      onClick={() => setActiveNav(label)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition cursor-pointer border-none
                        ${activeNav === label ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:bg-white/8 hover:text-white'}`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon size={15} />
                        {label}
                      </span>
                      {badge       && <span className="text-[11px] bg-white/15 px-1.5 py-0.5 rounded">{badge}</span>}
                      {badgeRed    && <span className="text-[11px] bg-red-500 px-1.5 py-0.5 rounded">{badgeRed}</span>}
                      {badgeYellow && <span className="text-[11px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-semibold">{badgeYellow}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold uppercase">
              {user?.[0] ?? 'U'}
            </div>
            <span className="text-sm text-gray-300 truncate max-w-[110px]">{user}</span>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="text-gray-500 hover:text-red-400 transition cursor-pointer bg-transparent border-none p-1 rounded"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#13151f]">
          <h1 className="text-sm font-semibold">{activeNav}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-lg px-2.5 py-1">
              <Search size={12} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search shipments..."
                className="bg-transparent text-xs text-gray-300 placeholder-gray-500 outline-none w-36"
              />
            </div>
            <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/8 border border-white/10 hover:bg-white/15 transition cursor-pointer">
              <Bell size={13} className="text-gray-400" />
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/8 border border-white/10 hover:bg-white/15 transition cursor-pointer">
              <RefreshCw size={13} className="text-gray-400" />
            </button>
            <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 transition px-3 py-1 rounded-lg text-xs font-medium cursor-pointer border-none text-white">
              <Send size={12} />
              Transmit EDI
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/8 border border-white/10 hover:bg-white/15 transition cursor-pointer">
              <MoreHorizontal size={13} className="text-gray-400" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeNav === 'Load Tenders'  && <LoadTenders />}
          {activeNav === 'Shipments'     && <ShipmentsTable />}
          {activeNav === 'Invoices'      && <Invoices />}
          {activeNav === 'Transmissions' && <Transmissions />}
          {activeNav === 'Partners'      && <Partners />}
          {activeNav === 'Settings'      && <Settings />}
          {activeNav === 'Dashboard' && (<>

          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-4">
            {statCards.map(({ icon: Icon, label, value, sub, subColor, valueColor }) => (
              <div key={label} className="bg-[#13151f] rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
                  <Icon size={13} />
                  <span>{label}</span>
                </div>
                <p className={`text-3xl font-bold ${valueColor ?? 'text-white'}`}>{value}</p>
                <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Bottom Grid */}
          <div className="grid grid-cols-5 gap-4">

            {/* Active Shipments */}
            <div className="col-span-3 bg-[#13151f] rounded-xl border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-gray-400" />
                  <span className="font-semibold text-sm">Active shipments</span>
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">12 in transit</span>
                </div>
                <button className="text-xs text-blue-400 hover:underline cursor-pointer bg-transparent border-none">View all</button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-white/10">
                    <th className="text-left px-5 py-2.5 font-medium">Shipment</th>
                    <th className="text-left px-5 py-2.5 font-medium">Route</th>
                    <th className="text-left px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-5 py-3 text-gray-400 text-xs font-mono">{s.id}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-white text-xs">{s.route}</p>
                        <p className="text-gray-500 text-xs">{s.company}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${s.statusColor}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* EDI Pipeline */}
            <div className="col-span-2 bg-[#13151f] rounded-xl border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/10">
                <ArrowUpDown size={14} className="text-gray-400" />
                <span className="font-semibold text-sm">EDI pipeline</span>
              </div>
              <ul className="divide-y divide-white/5">
                {ediPipeline.map((e) => (
                  <li key={e.code + e.time} className="flex items-start gap-3 px-5 py-3 hover:bg-white/5 transition">
                    <CheckCircle2 size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold">{e.code} — {e.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium
                          ${e.dir === 'OUT' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                          {e.dir}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{e.desc}</p>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">{e.time}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
          </>)}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
