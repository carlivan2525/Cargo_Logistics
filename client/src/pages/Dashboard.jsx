import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Truck, FileText, Inbox,
  ArrowUpDown, Globe, Settings as SettingsIcon,
  Moon, Sun,
  LogOut, CheckCircle2, AlertTriangle, Package, FileCheck
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/CarGO-logo.png';
import ShipmentsTable from './Shipments';
import Invoices from './Invoices';
import Transmissions from './Transmissions';
import Partners from './Partners';
import Settings from './Settings';
import LoadTenders from './LoadTenders';
import { api } from '../api';

const navSections = [
  {
    title: 'MAIN',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard' },
      { icon: Inbox,           label: 'Load Tenders' },
      { icon: Truck,           label: 'Shipments' },
      { icon: FileText,        label: 'Invoices' },
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
  { icon: Truck,         label: 'Active Shipments', key: 'activeShipments', subColor: 'text-green-400' },
  { icon: ArrowUpDown,   label: '204 Received',     key: 'tenders204',      subColor: 'text-gray-400'  },
  { icon: FileCheck,     label: '214 Sent',          key: 'sent214',         subColor: 'text-gray-400'  },
  { icon: AlertTriangle, label: 'Exceptions',        key: 'exceptions',      subColor: 'text-red-400', valueColor: 'text-red-400' },
];

function Dashboard({ user, onLogout }) {
  const { setTheme, isDark } = useTheme();
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [counts, setCounts]       = useState({ tenders: 0, shipments: 0, invoices: 0 });
  const [stats, setStats]         = useState({ activeShipments: 0, tenders204: 0, sent214: 0, exceptions: 0 });
  const [recentShipments, setRecentShipments] = useState([]);
  const [recentEdi, setRecentEdi]             = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    Promise.all([
      api.get('/loadtenders'),
      api.get('/shipments'),
      api.get('/invoices'),
      api.get('/transmissions'),
    ]).then(([tenders, shipments, invoices, transmissions]) => {
      // Sidebar badges
      setCounts({
        tenders:   tenders.filter(t => t.status === 'Pending').length,
        shipments: shipments.filter(s => s.status === 'In Transit').length,
        invoices:  invoices.filter(i => i.status === 'Overdue').length,
      });
      // Stat cards
      setStats({
        activeShipments: shipments.filter(s => ['Pickup','In Transit'].includes(s.status)).length,
        tenders204:      tenders.length,
        sent214:         transmissions.filter(t => t.ediCode === '214').length,
        exceptions:      shipments.filter(s => s.status === 'Exception').length,
      });
      // Recent shipments (latest 5)
      setRecentShipments(shipments.slice(0, 5));
      // Recent EDI transmissions (latest 5)
      setRecentEdi(transmissions.slice(0, 5));
    }).catch(() => {});
  }, [activeNav]);

  const STATUS_COLOR = {
    'Pending':    'bg-gray-500/20 text-gray-400',
    'Pickup':     'bg-yellow-500/20 text-yellow-400',
    'In Transit': 'bg-blue-500/20 text-blue-400',
    'Delivered':  'bg-green-500/20 text-green-400',
    'Exception':  'bg-red-500/20 text-red-400',
  };

  const navWithCounts = navSections.map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      badgeYellow: item.label === 'Load Tenders' && counts.tenders   > 0 ? counts.tenders   : null,
      badge:       item.label === 'Shipments'    && counts.shipments > 0 ? counts.shipments  : null,
      badgeRed:    item.label === 'Invoices'     && counts.invoices  > 0 ? counts.invoices   : null,
    })),
  }));

  return (
    <div className="flex h-screen w-screen bg-app text-app overflow-hidden">

      {/* Sidebar */}
      <aside className="w-60 min-w-[240px] bg-card flex flex-col border-r border-app">

        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-app">
          <img src={logo} alt="CarGO Logo" className="h-12 w-auto object-contain" />
          <p className="text-sm font-bold text-app">CarGO</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navWithCounts.map(({ title, items }) => (
            <div key={title}>
              <p className="text-[10px] font-semibold text-gray-500 tracking-widest px-2 mb-1.5">{title}</p>
              <ul className="space-y-0.5">
                {items.map(({ icon: Icon, label, badge, badgeRed, badgeYellow }) => (
                  <li key={label}>
                    <button
                      onClick={() => setActiveNav(label)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition cursor-pointer border-none
                        ${activeNav === label ? 'bg-blue-600 text-white font-medium' : 'text-secondary-app hover:bg-hover hover:text-app'}`}
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
        <div className="px-4 py-3 border-t border-app flex items-center justify-between">
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
        <header className="flex items-center justify-between px-4 py-1.5 border-b border-app bg-card">
          <span className="text-sm font-medium text-app">{activeNav}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`relative w-11 h-6 rounded-full transition cursor-pointer border-none flex-shrink-0
                ${isDark ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-all flex items-center justify-center bg-white
                ${isDark ? 'left-5' : 'left-0.5'}`}>
                {isDark ? <Moon size={11} className="text-blue-600" /> : <Sun size={11} className="text-yellow-500" />}
              </span>
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
            {statCards.map(({ icon: Icon, label, key, subColor, valueColor }) => (
              <div key={label} className="bg-card rounded-xl p-4 border border-app">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
                  <Icon size={13} />
                  <span>{label}</span>
                </div>
                <p className={`text-3xl font-bold ${valueColor ?? 'text-app'}`}>{stats[key]}</p>
                <p className={`text-xs mt-1 ${subColor}`}>
                  {key === 'activeShipments' && 'In pickup or transit'}
                  {key === 'tenders204'      && 'Load tenders received'}
                  {key === 'sent214'         && 'Status updates sent'}
                  {key === 'exceptions'      && 'Requires review'}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom Grid */}
          <div className="grid grid-cols-5 gap-4">

            {/* Active Shipments */}
            <div className="col-span-3 bg-card rounded-xl border border-app overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-app">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-gray-400" />
                  <span className="font-semibold text-sm">Active Shipments</span>
                  {stats.activeShipments > 0 && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{stats.activeShipments} active</span>
                  )}
                </div>
                <button onClick={() => setActiveNav('Shipments')} className="text-xs text-blue-400 hover:underline cursor-pointer bg-transparent border-none">View all</button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-app">
                    <th className="text-left px-5 py-2.5 font-medium">Shipment</th>
                    <th className="text-left px-5 py-2.5 font-medium">Route</th>
                    <th className="text-left px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentShipments.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-8 text-gray-600 text-xs">No shipments yet.</td></tr>
                  ) : recentShipments.map(s => (
                    <tr key={s._id} className="border-b border-subtle hover:bg-hover transition">
                      <td className="px-5 py-3 text-gray-400 text-xs font-mono">{s.shipmentId}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-app text-xs">{s.route}</p>
                        <p className="text-gray-500 text-xs">{s.partner?.name}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[s.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* EDI Pipeline */}
            <div className="col-span-2 bg-card rounded-xl border border-app overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-app">
                <ArrowUpDown size={14} className="text-gray-400" />
                <span className="font-semibold text-sm">Recent EDI</span>
              </div>
              <ul className="divide-y divide-app">
                {recentEdi.length === 0 ? (
                  <li className="text-center py-8 text-gray-600 text-xs">No transmissions yet.</li>
                ) : recentEdi.map(e => (
                  <li key={e._id} className="flex items-start gap-3 px-5 py-3 hover:bg-hover transition">
                    <CheckCircle2 size={16} className={`mt-0.5 flex-shrink-0 ${e.status === 'Failed' ? 'text-red-400' : 'text-green-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold">{e.ediCode} — {e.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium
                          ${e.direction === 'OUT' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                          {e.direction}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{e.partner?.name}</p>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {new Date(e.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
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
