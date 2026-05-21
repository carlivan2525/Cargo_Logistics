import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

// Aggregate shipments by day for the last N days
function buildChartData(shipments, days = 14) {
  const now = new Date();
  const buckets = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    buckets[key] = 0;
  }

  shipments.forEach(s => {
    const d = new Date(s.createdAt);
    const key = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    if (key in buckets) buckets[key]++;
  });

  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-app rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-blue-400 font-semibold">{payload[0].value} shipment{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
};

export default function ShipmentsChart({ shipments = [] }) {
  const data = buildChartData(shipments, 14);
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-card rounded-xl border border-app p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-gray-400" />
          <span className="font-semibold text-sm">Shipments Over Time</span>
          <span className="text-xs text-gray-500">last 14 days</span>
        </div>
        <span className="text-xs text-blue-400 font-medium">{total} total</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#60a5fa', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
