import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { Calculator, Truck, Info, X, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';
import { api } from '../api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default marker icons (broken in Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const VEHICLE_TYPES = ['Motorcycle', 'Sedan', 'SUV', 'L300', 'Closed Van', 'Elf Truck', 'Wing Van', '6-Wheeler Truck', '10-Wheeler Truck'];
const VEHICLE_DESC = {
  'Motorcycle':        'Motorbike — docs & small parcels up to 20kg',
  'Sedan':             'Car delivery — up to 200kg',
  'SUV':               'SUV — up to 400kg',
  'L300':              'L300 Van — up to 800kg',
  'Closed Van':        'Closed Van (Hiace) — up to 1 ton',
  'Elf Truck':         'Isuzu Elf — up to 2 tons',
  'Wing Van':          'Wing Van (4W) — up to 3 tons',
  '6-Wheeler Truck':   '6-Wheeler Truck — up to 6 tons',
  '10-Wheeler Truck':  '10-Wheeler Truck — up to 15 tons',
};
const DEFAULT_RATE_PER_KM = { Motorcycle: 10, Sedan: 15, SUV: 20, L300: 25, 'Closed Van': 30, 'Elf Truck': 40, 'Wing Van': 50, '6-Wheeler Truck': 65, '10-Wheeler Truck': 80 };
const DEFAULT_MIN_CHARGE  = { Motorcycle: 150, Sedan: 250, SUV: 350, L300: 500, 'Closed Van': 600, 'Elf Truck': 800, 'Wing Van': 1000, '6-Wheeler Truck': 1500, '10-Wheeler Truck': 2000 };

// Fly map to fit route bounds
function MapFitter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (!coords) return;
    const { origin, dest } = coords;
    const bounds = L.latLngBounds([
      [origin.lat, origin.lng],
      [dest.lat,   dest.lng],
    ]);
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [coords, map]);
  return null;
}

// Fetch actual road route from OSRM (free, no API key)
async function fetchRoadRoute(originCoords, destCoords) {
  const url = `https://router.project-osrm.org/route/v1/driving/` +
    `${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}` +
    `?overview=full&geometries=geojson`;
  const res  = await fetch(url);
  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes?.length) return null;
  // GeoJSON coords are [lng, lat] — flip to [lat, lng] for Leaflet
  const coords = json.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  const distanceKm = Math.round(json.routes[0].distance / 1000);
  return { coords, distanceKm };
}

function CitySearch({ label, value, onChange }) {
  const [query, setQuery]       = useState(value || '');
  const [options, setOptions]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [notFound, setNotFound] = useState(false);
  const ref        = useRef(null);
  const debounceRef = useRef(null);
  const confirmed  = !!value && value.toLowerCase() === query.toLowerCase();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const search = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setOptions([]); setNotFound(false); return; }
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      api.get('/pricing/cities?q=' + encodeURIComponent(q))
        .then(res => { setOptions(res); setNotFound(res.length === 0); })
        .catch(() => { setOptions([]); setNotFound(true); })
        .finally(() => setLoading(false));
    }, 200);
  }, []);

  const handleChange = e => {
    const val = e.target.value;
    setQuery(val); onChange(''); setOpen(true); setNotFound(false); search(val);
  };
  const select = city => { setQuery(city); onChange(city); setOpen(false); setNotFound(false); };
  const clear  = () => { setQuery(''); onChange(''); setOptions([]); setNotFound(false); setOpen(false); };

  const borderColor = confirmed ? 'border-green-500' : notFound && query ? 'border-red-500/60' : open ? 'border-blue-500' : 'border-app';

  return (
    <div ref={ref} className="relative">
      <label className="text-xs text-gray-400 mb-1.5 block">{label}</label>
      <div className={`flex items-center bg-input border rounded-lg px-3 py-2.5 gap-2 transition ${borderColor}`}>
        <MapPin size={13} className={`flex-shrink-0 ${confirmed ? 'text-green-400' : 'text-gray-500'}`} />
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => { setOpen(true); if (query && !confirmed) search(query); }}
          placeholder="Search city..."
          className="flex-1 bg-transparent text-sm text-app outline-none placeholder-gray-600"
        />
        {confirmed && <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />}
        {notFound && query && !confirmed && <AlertCircle size={13} className="text-red-400 flex-shrink-0" />}
        {query && (
          <button onMouseDown={e => { e.preventDefault(); clear(); }}
            className="text-gray-500 hover:text-gray-300 bg-transparent border-none cursor-pointer p-0 flex-shrink-0">
            <X size={13} />
          </button>
        )}
      </div>
      {confirmed && <p className="text-[11px] text-green-400 mt-1 flex items-center gap-1"><CheckCircle2 size={10} /> Available in database</p>}
      {notFound && query && !confirmed && <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10} /> Not available in our database</p>}
      {open && query && !confirmed && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-app rounded-xl shadow-2xl overflow-hidden">
          {loading && <p className="text-xs text-gray-500 px-3 py-2.5">Searching...</p>}
          {!loading && options.length === 0 && query && (
            <div className="px-3 py-3 flex items-center gap-2">
              <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">Not available in our database</p>
            </div>
          )}
          {!loading && options.length > 0 && (
            <ul className="max-h-56 overflow-y-auto">
              {options.map(city => (
                <li key={city} onMouseDown={() => select(city)}
                  className="px-3 py-2 text-sm text-app hover:bg-hover cursor-pointer transition flex items-center gap-2">
                  <CheckCircle2 size={11} className="text-green-400 flex-shrink-0" /> {city}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function FreightRates() {
  const [origin, setOrigin]         = useState('');
  const [dest, setDest]             = useState('');
  const [vehicleType, setVehicle]   = useState('Truck');
  const [result, setResult]         = useState(null);
  const [mapCoords, setMapCoords]   = useState(null);
  const [roadPath, setRoadPath]     = useState(null);
  const [roadKm, setRoadKm]         = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  // Rate schedule state
  const [ratePerKm, setRatePerKm]   = useState(DEFAULT_RATE_PER_KM);
  const [minCharge, setMinCharge]   = useState(DEFAULT_MIN_CHARGE);
  const [editRates, setEditRates]   = useState(false);
  const [draftRates, setDraftRates] = useState(null);
  const [savingRates, setSavingRates] = useState(false);
  const [ratesSaved, setRatesSaved] = useState(false);

  useEffect(() => {
    api.get('/pricing/config')
      .then(data => {
        setRatePerKm(data.ratePerKm);
        setMinCharge(data.minCharge);
      })
      .catch(() => {});
  }, []);

  const startEdit = () => {
    setDraftRates({
      ratePerKm: { ...ratePerKm },
      minCharge:  { ...minCharge },
    });
    setEditRates(true);
    setRatesSaved(false);
  };

  const cancelEdit = () => {
    setEditRates(false);
    setDraftRates(null);
  };

  const saveRates = async () => {
    setSavingRates(true);
    try {
      const updated = await api.put('/pricing/config', draftRates);
      setRatePerKm(updated.ratePerKm);
      setMinCharge(updated.minCharge);
      setEditRates(false);
      setDraftRates(null);
      setRatesSaved(true);
      setTimeout(() => setRatesSaved(false), 2000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingRates(false);
    }
  };

  const canCalculate = origin && dest && origin !== dest;

  const calculate = async () => {
    if (!canCalculate) return;
    setError(''); setResult(null); setMapCoords(null); setRoadPath(null); setRoadKm(null);
    setLoading(true);
    try {
      const data = await api.post('/pricing/calculate', { route: `${origin} - ${dest}`, vehicleType });
      setResult(data);
      const mc = { origin: data.originCoords, dest: data.destCoords };
      setMapCoords(mc);

      // Fetch actual road route from OSRM
      setRouteLoading(true);
      fetchRoadRoute(data.originCoords, data.destCoords)
        .then(road => {
          if (road) { setRoadPath(road.coords); setRoadKm(road.distanceKm); }
        })
        .catch(() => {}) // silently fall back to straight line
        .finally(() => setRouteLoading(false));
    } catch (err) {
      setError(err.message || 'Could not calculate.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = n => '₱' + Number(n || 0).toLocaleString('en-PH');

  const PH_CENTER = [12.8797, 121.7740];
  // Philippines bounding box (approx). Constrains panning to PH only.
  const PH_BOUNDS = [
    [4.5, 116.8],   // SW (near Sabah/Sulu Sea)
    [21.4, 127.1],  // NE (north of Luzon / Philippine Sea)
  ];

  return (
    <div className="flex gap-4 h-full" style={{ minHeight: '500px' }}>

      {/* LEFT — Calculator */}
      <div className="w-[480px] shrink-0 space-y-4 overflow-y-auto">
        <div className="bg-card rounded-xl border border-app overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-app">
            <Calculator size={13} className="text-blue-400" />
            <span className="font-semibold text-sm text-app">Price Calculator</span>
          </div>
          <div className="p-4 space-y-3">
            <CitySearch label="Origin" value={origin} onChange={v => { setOrigin(v); setResult(null); setMapCoords(null); setRoadPath(null); setRoadKm(null); }} />
            <CitySearch label="Destination" value={dest} onChange={v => { setDest(v); setResult(null); setMapCoords(null); setRoadPath(null); setRoadKm(null); }} />
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Vehicle Type</label>
              <div className="grid grid-cols-2 gap-1.5">
                {VEHICLE_TYPES.map(v => (
                  <button key={v} onClick={() => { setVehicle(v); setResult(null); }}
                    className={`py-1.5 rounded-lg text-xs font-medium transition border cursor-pointer
                      ${vehicleType === v ? 'bg-blue-600 border-blue-600 text-white' : 'bg-input border-app text-gray-400 hover:text-app'}`}>
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">{VEHICLE_DESC[vehicleType]}</p>
            </div>
            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            <button onClick={calculate} disabled={loading || !canCalculate}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition cursor-pointer border-none disabled:opacity-40">
              {loading ? 'Calculating...' : 'Calculate Price'}
            </button>
            {result && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Estimated Cost</span>
                  <span className="text-xl font-bold text-green-400">{fmt(result.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 -mt-1">
                  <span>Freight</span><span>{fmt(result.amount)}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-green-500/20 text-center">
                  <div>
                    <p className="text-[10px] text-gray-500">Distance</p>
                    <p className="text-xs font-semibold text-app">{result.distanceKm} km</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Rate/km</p>
                    <p className="text-xs font-semibold text-app">{fmt(result.ratePerKm)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Vehicle</p>
                    <p className="text-xs font-semibold text-app">{result.vehicleType}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rate Schedule — moved to Settings */}
      </div>

      {/* RIGHT — Map */}
      <div className="flex-1 min-w-0 bg-card rounded-xl border border-app overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-app shrink-0">
          <MapPin size={13} className="text-blue-400" />
          <span className="font-semibold text-sm text-app">Route Map</span>
          {mapCoords && result && (
            <span className="text-xs text-gray-500 ml-1">
              {result.origin} → {result.destination}
              {routeLoading
                ? <span className="text-yellow-400 ml-1">· loading road...</span>
                : <span className="ml-1">· {result.distanceKm} km</span>}
            </span>
          )}
        </div>
        <div className="flex-1">
          <MapContainer
            center={mapCoords ? [mapCoords.origin.lat, mapCoords.origin.lng] : PH_CENTER}
            zoom={6}
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
            scrollWheelZoom={true}
            minZoom={5}
            maxBounds={PH_BOUNDS}
            maxBoundsViscosity={1.0}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapCoords && (
              <>
                <MapFitter coords={mapCoords} />
                <Marker position={[mapCoords.origin.lat, mapCoords.origin.lng]} icon={originIcon}>
                  <Popup><strong>{result?.origin}</strong><br />Origin</Popup>
                </Marker>
                <Marker position={[mapCoords.dest.lat, mapCoords.dest.lng]} icon={destIcon}>
                  <Popup><strong>{result?.destination}</strong><br />Destination</Popup>
                </Marker>
                {roadPath ? (
                  <Polyline positions={roadPath} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.9 }} />
                ) : (
                  <Polyline
                    positions={[[mapCoords.origin.lat, mapCoords.origin.lng],[mapCoords.dest.lat, mapCoords.dest.lng]]}
                    pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '8 6', opacity: 0.6 }}
                  />
                )}
              </>
            )}
            {!mapCoords && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, pointerEvents: 'none' }}>
                <div className="bg-card/80 backdrop-blur-sm border border-app rounded-xl px-4 py-3 text-xs text-gray-400 text-center">
                  Select origin & destination<br />then calculate to see the route
                </div>
              </div>
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default FreightRates;
