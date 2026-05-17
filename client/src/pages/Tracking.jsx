import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, CheckCircle2, Clock, Search } from 'lucide-react';

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const truckIcon = new L.DivIcon({
  html: `<div style="background:#3b82f6;border-radius:50%;width:14px;height:14px;border:2px solid white;box-shadow:0 0 6px #3b82f6"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const SHIPMENTS = [
  {
    id: 'SHP-0516-001', route: 'Manila → Cebu', company: 'RetailCo PH',
    status: 'In Transit', eta: 'May 18, 2026',
    coords: { from: [14.5995, 120.9842], to: [10.3157, 123.8854], current: [12.5, 122.5] },
    events: [
      { time: '09:14', label: 'Picked up from Manila warehouse', location: 'Manila', done: true },
      { time: '11:30', label: 'Departed Manila port', location: 'Manila Port', done: true },
      { time: '14:00', label: 'In transit to Cebu', location: 'Visayan Sea', done: true },
      { time: '—',     label: 'Arriving Cebu port', location: 'Cebu Port', done: false },
    ],
  },
  {
    id: 'SHP-0516-002', route: 'Batangas → Davao', company: 'SupplyMax',
    status: 'Out for Delivery', eta: 'May 17, 2026',
    coords: { from: [13.7565, 121.0583], to: [7.1907, 125.4553], current: [7.3, 125.3] },
    events: [
      { time: '07:00', label: 'Picked up from Batangas', location: 'Batangas', done: true },
      { time: '10:15', label: 'Arrived Davao hub', location: 'Davao Hub', done: true },
      { time: '12:00', label: 'Out for delivery', location: 'Davao City', done: true },
      { time: '—',     label: 'Delivered to consignee', location: 'Davao City', done: false },
    ],
  },
  {
    id: 'SHP-0516-003', route: 'Laguna → QC', company: 'MFG Direct',
    status: 'Delivered', eta: 'May 16, 2026',
    coords: { from: [14.1407, 121.4692], to: [14.6760, 121.0437], current: [14.6760, 121.0437] },
    events: [
      { time: '08:00', label: 'Picked up from Laguna', location: 'Laguna', done: true },
      { time: '10:30', label: 'In transit to QC', location: 'SLEX', done: true },
      { time: '13:45', label: 'Delivered to consignee', location: 'Quezon City', done: true },
    ],
  },
];

const STATUS_STYLE = {
  'In Transit':       'bg-blue-500/20 text-blue-400',
  'Out for Delivery': 'bg-orange-500/20 text-orange-400',
  'Delivered':        'bg-green-500/20 text-green-400',
  'Pending':          'bg-gray-500/20 text-gray-400',
  'Exception':        'bg-red-500/20 text-red-400',
};

// Recenter map when selected shipment changes
function MapController({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 7, { animate: true }); }, [center]);
  return null;
}

function Tracking() {
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(SHIPMENTS[0]);

  const filtered = SHIPMENTS.filter(s =>
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.company.toLowerCase().includes(search.toLowerCase()) ||
    s.route.toLowerCase().includes(search.toLowerCase())
  );

  const { from, to, current } = selected.coords;
  const center = current;

  return (
    <div className="flex gap-4 h-full">
      {/* Left: list */}
      <div className="w-72 flex-shrink-0 bg-[#13151f] rounded-xl border border-white/10 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            <Search size={12} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search shipment..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-full"
            />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-white/5">
          {filtered.map(s => (
            <li key={s.id}>
              <button
                onClick={() => setSelected(s)}
                className={`w-full text-left px-4 py-3 hover:bg-white/5 transition border-none cursor-pointer
                  ${selected?.id === s.id ? 'bg-blue-600/10 border-l-2 border-blue-500' : ''}`}
              >
                <p className="text-xs font-mono text-gray-400">{s.id}</p>
                <p className="text-sm font-medium text-white mt-0.5">{s.route}</p>
                <p className="text-xs text-gray-500">{s.company}</p>
                <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full ${STATUS_STYLE[s.status]}`}>
                  {s.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: map + timeline */}
      {selected && (
        <div className="flex-1 bg-[#13151f] rounded-xl border border-white/10 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <MapPin size={15} className="text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-white">{selected.id}</p>
                <p className="text-xs text-gray-500">{selected.route} · {selected.company}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[selected.status]}`}>{selected.status}</span>
              <span className="text-xs text-gray-500">ETA: {selected.eta}</span>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 min-h-0">
            <MapContainer
              center={center}
              zoom={7}
              style={{ height: '100%', width: '100%', background: '#0f1117' }}
              zoomControl={true}
            >
              <MapController center={center} />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />
              {/* Route line */}
              <Polyline
                positions={[from, to]}
                pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '6 4', opacity: 0.6 }}
              />
              {/* Origin */}
              <Marker position={from}>
                <Popup><span style={{ color: '#000' }}>Origin: {selected.route.split(' → ')[0]}</span></Popup>
              </Marker>
              {/* Destination */}
              <Marker position={to}>
                <Popup><span style={{ color: '#000' }}>Destination: {selected.route.split(' → ')[1]}</span></Popup>
              </Marker>
              {/* Current position */}
              <Marker position={current} icon={truckIcon}>
                <Popup><span style={{ color: '#000' }}>{selected.id} — {selected.status}</span></Popup>
              </Marker>
            </MapContainer>
          </div>

          {/* Timeline */}
          <div className="px-6 py-4 border-t border-white/10 flex-shrink-0 max-h-48 overflow-y-auto">
            <p className="text-[10px] text-gray-500 font-semibold tracking-widest mb-3">TRACKING TIMELINE</p>
            <ol className="relative border-l border-white/10 space-y-4 ml-2">
              {selected.events.map((ev, i) => (
                <li key={i} className="ml-5">
                  <span className={`absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full
                    ${ev.done ? 'bg-green-500' : 'bg-white/10'}`}>
                    {ev.done
                      ? <CheckCircle2 size={10} className="text-white" />
                      : <Clock size={10} className="text-gray-500" />}
                  </span>
                  <div className={ev.done ? 'text-white' : 'text-gray-600'}>
                    <p className="text-xs font-medium">{ev.label}</p>
                    <p className="text-[11px] mt-0.5">{ev.location}{ev.time !== '—' && ` · ${ev.time}`}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tracking;
