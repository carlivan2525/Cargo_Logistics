import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Truck, FileText, Inbox,
  ArrowUpDown, Globe, Settings as SettingsIcon,
  Info, LogOut, CheckCircle2, AlertTriangle, Package, FileCheck, Calculator, Wallet
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/CarGO-logo.png';
import ShipmentsTable from './Shipments';
import Invoices from './Invoices';
import Transmissions from './Transmissions';
import Partners from './Partners';
import About from './About';
import Settings from './Settings';
import LoadTenders from './LoadTenders';
import FreightRates from './FreightRates';
import Ledger from './Ledger';
import { api } from '../api';
import { usePolling } from '../hooks/usePolling';
import ShipmentsChart from '../components/ShipmentsChart';
import InvoiceAnalytics from '../components/InvoiceAnalytics';
import { useToast } from '../components/Toast';

const navSections = [
  {
    title: 'MAIN',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard' },
      { icon: Inbox,           label: 'Load Tenders' },
      { icon: Truck,           label: 'Shipments' },
      { icon: FileText,        label: 'Invoices' },
      { icon: Calculator,      label: 'Price Checker' },
      { icon: Wallet,          label: 'Ledger' },
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
      { icon: Info,         label: 'About' },
    ],
  },
];

const statCards = [
  { icon: Truck,         label: 'Active Shipments', key: 'activeShipments', subColor: 'text-green-400' },
  { icon: ArrowUpDown,   label: '204 Received',     key: 'tenders204',      subColor: 'text-gray-400'  },
  { icon: FileCheck,     label: '214 Sent',          key: 'sent214',         subColor: 'text-gray-400'  },
  { icon: AlertTriangle, label: 'Exceptions',        key: 'exceptions',      subColor: 'text-red-400', valueColor: 'text-red-400' },
];

// map between URL slug and nav label
const SLUG_TO_LABEL = {
  '':               'Dashboard',
  'load-tenders':   'Load Tenders',
  'shipments':      'Shipments',
  'invoices':       'Invoices',
  'freight-rates':  'Price Checker',
  'ledger':         'Ledger',
  'transmissions':  'Transmissions',
  'partners':       'Partners',
  'settings':       'Settings',
  'about':          'About',
};
const LABEL_TO_SLUG = Object.fromEntries(Object.entries(SLUG_TO_LABEL).map(([k,v]) => [v, k]));

function LogoutButton({ onLogout }) {
  const [loading, setLoading] = useState(false);
  const handle = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogout(); }, 3000);
  };
  return (
    <button
      onClick={handle}
      disabled={loading}
      title="Logout"
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition cursor-pointer border-none text-red-200 hover:bg-sidebar-hover hover:text-red-100 disabled:opacity-70"
    >
      {loading
        ? <span className="w-4 h-4 border-2 border-red-200 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        : <LogOut size={15} className="flex-shrink-0" />}
      <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
        {loading ? 'Logging out...' : 'Logout'}
      </span>
    </button>
  );
}

function Dashboard({ user, onLogout }) {
  const { setTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { show: showToast, node: toastNode } = useToast();
  const prevTenderCountRef = useRef(null);
  const prevPaidInvoiceIdsRef = useRef(new Set());

  // derive active nav from URL
  const slug = location.pathname.replace(/^\/dashboard\/?/, '');
  const activeNav = SLUG_TO_LABEL[slug] ?? 'Dashboard';

  const setActiveNav = (label) => {
    const s = LABEL_TO_SLUG[label] ?? '';
    navigate(s ? `/dashboard/${s}` : '/dashboard');
  };
  const [counts, setCounts]       = useState({ tenders: 0, shipments: 0, invoices: 0 });
  const [stats, setStats]         = useState({ activeShipments: 0, tenders204: 0, sent214: 0, exceptions: 0 });
  const [recentShipments, setRecentShipments] = useState([]);
  const [recentEdi, setRecentEdi]             = useState([]);
  const [allShipments, setAllShipments]       = useState([]);
  const [allInvoices, setAllInvoices]         = useState([]);

  const fetchDashboard = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    Promise.all([
      api.get('/loadtenders'),
      api.get('/shipments'),
      api.get('/invoices'),
      api.get('/transmissions'),
    ]).then(([tenders, shipments, invoices, txRes]) => {
      const transmissions = txRes.data ?? txRes;
      setCounts({
        tenders:   tenders.filter(t => t.status === 'Pending').length,
        shipments: shipments.filter(s => s.status === 'Pending').length,
        invoices:  invoices.filter(i => i.status === 'Pending').length,
      });
      setStats({
        activeShipments: shipments.filter(s => ['Pickup','In Transit'].includes(s.status)).length,
        tenders204:      tenders.length,
        sent214:         transmissions.filter(t => t.ediCode === '214').length,
        exceptions:      shipments.filter(s => s.status === 'Exception').length,
      });
      setRecentShipments(shipments.slice(0, 5));
      setAllShipments(shipments);
      setRecentEdi(transmissions.slice(0, 5));
      setAllInvoices(invoices);
      // global 204 toast — fires on any page
      if (prevTenderCountRef.current !== null && tenders.length > prevTenderCountRef.current) {
        const diff = tenders.length - prevTenderCountRef.current;
        showToast(`${diff} new EDI 204 load tender${diff > 1 ? 's' : ''} received.`, 'info');
      }
      prevTenderCountRef.current = tenders.length;

      // global 820 payment toast — fires when an invoice flips to Paid
      const paidNow = new Set((invoices || []).filter(i => i.status === 'Paid').map(i => i.invoiceId));
      const prev = prevPaidInvoiceIdsRef.current;
      if (prev.size > 0) {
        const newlyPaid = [];
        for (const id of paidNow) if (!prev.has(id)) newlyPaid.push(id);
        if (newlyPaid.length > 0) {
          const msg = newlyPaid.length === 1
            ? `Payment received — ${newlyPaid[0]} marked Paid (EDI 820).`
            : `Payments received — ${newlyPaid.length} invoices marked Paid (EDI 820).`;
          showToast(msg, 'success');
        }
      }
      prevPaidInvoiceIdsRef.current = paidNow;
    }).catch(() => {});
  };

  usePolling(fetchDashboard);

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
      {toastNode}

      {/* Sidebar */}
      <aside className="group/sidebar relative z-20 flex-shrink-0 w-14 hover:w-60 transition-all duration-150 ease-out bg-sidebar text-sidebar flex flex-col border-r border-sidebar overflow-hidden">

        {/* Brand — logo */}
        <div className="flex items-center border-b border-sidebar overflow-hidden h-[72px] flex-shrink-0 px-2">
          <img src={logo} alt="CarGO Logo" className="h-10 w-10 object-contain flex-shrink-0" />
          <span
            className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 ml-2.5 text-sm font-bold tracking-wide text-sidebar"
            style={{ fontFamily: "'Rajdhani', sans-serif" }}
          >
            Car<span style={{ textTransform: 'uppercase' }}>GO</span> Logistics
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-1.5 py-4 space-y-1">
          {navWithCounts.map(({ title, items }, sectionIdx) => (
            <div key={title}>
              {sectionIdx > 0 && <div className="border-t border-sidebar my-2" />}
              <ul className="space-y-0.5">
                {items.map(({ icon: Icon, label, badge, badgeRed, badgeYellow }) => (
                  <li key={label}>
                    <button
                      onClick={() => setActiveNav(label)}
                      title={label}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition cursor-pointer border-none
                        ${activeNav === label ? 'bg-sidebar-active text-sidebar font-medium' : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar'}`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon size={15} className="flex-shrink-0" />
                        <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 overflow-hidden">
                          {label}
                        </span>
                      </span>
                      {(badge || badgeRed || badgeYellow) && (
                        <span className="group-hover/sidebar:hidden flex-shrink-0 flex items-center">
                          <span className={`w-2 h-2 rounded-full block ${badgeRed ? 'bg-red-500' : badgeYellow ? 'bg-yellow-500' : 'bg-white/60'}`} />
                        </span>
                      )}
                      <span className="hidden group-hover/sidebar:flex flex-shrink-0 items-center gap-1">
                        {badge       && <span className="text-[11px] bg-white/15 px-1.5 py-0.5 rounded">{badge}</span>}
                        {badgeRed    && <span className="text-[11px] bg-red-500 px-1.5 py-0.5 rounded">{badgeRed}</span>}
                        {badgeYellow && <span className="text-[11px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-semibold">{badgeYellow}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Logout — above footer line */}
        <div className="px-1.5 pb-2">
          <LogoutButton onLogout={onLogout} />
        </div>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-sidebar overflow-hidden">
          <p className="text-[10px] text-sidebar-muted whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 text-center">
            © 2026 CarGO Logistics Services
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center px-5 border-b border-app bg-card h-[72px] flex-shrink-0 gap-4">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-app leading-tight tracking-tight">{activeNav}</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-app capitalize leading-none">{user}</p>
              <p className="text-xs text-gray-500 mt-0.5">Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold uppercase text-white flex-shrink-0">
              {user?.[0] ?? 'U'}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-hidden ${activeNav === 'Load Tenders' || activeNav === 'Price Checker' ? 'flex flex-col p-6' : 'overflow-y-auto p-6 space-y-5'}`}>
          {activeNav === 'Load Tenders'  && <LoadTenders />}
          {activeNav === 'Shipments'     && <ShipmentsTable key="shipments" />}
          {activeNav === 'Invoices'      && <Invoices />}
          {activeNav === 'Price Checker' && <FreightRates />}
          {activeNav === 'Ledger'        && <Ledger />}
          {activeNav === 'Transmissions' && <Transmissions />}
          {activeNav === 'Partners'      && <Partners />}
          {activeNav === 'Settings'      && <Settings onLogout={onLogout} />}
          {activeNav === 'About'         && <About />}
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
                      {new Date(e.createdAt).toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' }) + ' ' +
                       new Date(e.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Shipments Over Time */}
          <ShipmentsChart shipments={allShipments} />

          {/* Invoice Analytics */}
          <InvoiceAnalytics invoices={allInvoices} />

          </>)}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
