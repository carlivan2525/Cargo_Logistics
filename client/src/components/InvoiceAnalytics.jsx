import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, Users } from 'lucide-react';

const fmt = n => '₱' + Number(n || 0).toLocaleString('en-PH');

// ── 1. Revenue Over Time (last 8 weeks) ─────────────────────────────────────
function buildRevenueOverTime(invoices) {
  const buckets = {};
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const key = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    buckets[key] = 0;
  }
  invoices.forEach(inv => {
    const d = new Date(inv.createdAt);
    // find which week bucket this falls in
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      if (d >= start && d < end) {
        const key = start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
        if (key in buckets) buckets[key] += inv.amount || 0;
        break;
      }
    }
  });
  return Object.entries(buckets).map(([week, revenue]) => ({ week, revenue }));
}

const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-app rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400 mb-1">Week of {label}</p>
      <p className="text-blue-400 font-semibold">{fmt(payload[0].value)}</p>
    </div>
  );
};

// ── 2. Invoice Status Breakdown (donut) ─────────────────────────────────────
const STATUS_COLORS = {
  Paid:    '#22c55e',
  Pending: '#f59e0b',
  Overdue: '#ef4444',
  Draft:   '#6b7280',
};

function buildStatusBreakdown(invoices) {
  const counts = { Paid: 0, Pending: 0, Overdue: 0, Draft: 0 };
  invoices.forEach(inv => { if (counts[inv.status] !== undefined) counts[inv.status]++; });
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
}

const StatusTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-app rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold" style={{ color: STATUS_COLORS[payload[0].name] }}>{payload[0].name}</p>
      <p className="text-gray-400">{payload[0].value} invoice{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
};

// ── 3. Revenue by Partner (horizontal bar) ───────────────────────────────────
function buildRevenueByPartner(invoices) {
  const map = {};
  invoices.forEach(inv => {
    const name = inv.partner?.name || 'Unknown';
    map[name] = (map[name] || 0) + (inv.amount || 0);
  });
  return Object.entries(map)
    .map(([partner, revenue]) => ({ partner, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);
}

const PartnerTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-app rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-purple-400 font-semibold">{fmt(payload[0].value)}</p>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export default function InvoiceAnalytics({ invoices = [] }) {
  const revenueData  = buildRevenueOverTime(invoices);
  const statusData   = buildStatusBreakdown(invoices);
  const partnerData  = buildRevenueByPartner(invoices);

  return (
    <div className="space-y-4">

      {/* Revenue Over Time + Status Breakdown */}
      <div className="grid grid-cols-5 gap-4">

        {/* Revenue Over Time */}
        <div className="col-span-3 bg-card rounded-xl border border-app p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-gray-400" />
            <span className="font-semibold text-sm">Revenue Over Time</span>
            <span className="text-xs text-gray-500">last 8 weeks</span>
          </div>
          {invoices.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-gray-600 text-xs">No invoice data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `₱${(v/1000).toFixed(0)}k` : `₱${v}`} width={45} />
                <Tooltip content={<RevenueTooltip />} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Invoice Status Donut */}
        <div className="col-span-2 bg-card rounded-xl border border-app p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon size={14} className="text-gray-400" />
            <span className="font-semibold text-sm">Invoice Status</span>
          </div>
          {statusData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-gray-600 text-xs">No invoice data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map(entry => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip content={<StatusTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={v => <span style={{ fontSize: 11, color: '#9ca3af' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Revenue by Partner */}
      <div className="bg-card rounded-xl border border-app p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={14} className="text-gray-400" />
          <span className="font-semibold text-sm">Revenue by Partner</span>
          <span className="text-xs text-gray-500">top 6</span>
        </div>
        {partnerData.length === 0 ? (
          <div className="h-[160px] flex items-center justify-center text-gray-600 text-xs">No invoice data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, partnerData.length * 44)}>
            <BarChart data={partnerData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `₱${(v/1000).toFixed(0)}k` : `₱${v}`} />
              <YAxis type="category" dataKey="partner" tick={{ fontSize: 11, fill: '#d1d5db' }} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<PartnerTooltip />} />
              <Bar dataKey="revenue" fill="#a855f7" radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}
