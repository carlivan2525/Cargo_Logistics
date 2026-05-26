import { useState, useEffect, useRef } from 'react';
import { Shield, Save, Eye, EyeOff, Moon, Sun, KeyRound, X, LogOut, Truck, Pencil, Info, Upload, ImageIcon } from 'lucide-react';
import { api } from '../api';
import { useTheme } from '../context/ThemeContext';

const VEHICLE_TYPES = ['Motorcycle', 'Sedan', 'SUV', 'L300', 'Closed Van', 'Elf Truck', 'Wing Van', '6-Wheeler Truck', '10-Wheeler Truck'];

function PasswordField({ label, value, onChange, show, onToggle }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-500">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 pr-9 bg-input border border-app rounded-lg text-sm text-app outline-none focus:border-blue-500 transition"
        />
        <button type="button" onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 bg-transparent border-none cursor-pointer p-0">
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [current, setCurrent]     = useState('');
  const [newPass, setNewPass]     = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed]       = useState(false);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!current || !newPass || !confirm) return setError('Please fill in all fields.');
    if (newPass.length < 6) return setError('New password must be at least 6 characters.');
    if (newPass !== confirm) return setError('Passwords do not match.');
    if (!agreed) return setError('Please confirm the checkbox before proceeding.');
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword: current, newPassword: newPass });
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, value, onChange, show, onToggle }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-500">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 pr-9 bg-input border border-app rounded-lg text-sm text-app outline-none focus:border-blue-500 transition"
        />
        <button type="button" onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 bg-transparent border-none cursor-pointer p-0">
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-app rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-app">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-blue-400" />
            <span className="font-semibold text-sm text-app">Change Password</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-app bg-transparent border-none cursor-pointer"><X size={15} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <PasswordField label="Current Password" value={current} onChange={setCurrent} show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
          <PasswordField label="New Password"     value={newPass} onChange={setNewPass} show={showNew}     onToggle={() => setShowNew(v => !v)} />
          <PasswordField label="Confirm Password" value={confirm} onChange={setConfirm} show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-600 cursor-pointer" />
            <span className="text-xs text-gray-400">I confirm that I want to change my password.</span>
          </label>

          {error   && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-green-400">Password updated successfully.</p>}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-app">
          <button onClick={onClose}
            className="text-xs px-4 py-2 rounded-lg bg-hover border border-app text-gray-400 hover:opacity-80 transition cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || !agreed}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer border-none disabled:opacity-50">
            <Save size={12} /> {saving ? 'Updating...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

function VehicleImageManager() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [removing, setRemoving]   = useState(null);
  const fileRefs = useRef({});

  useEffect(() => {
    api.get('/vehicles').then(v => { setVehicles(v); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const removeBg = async (base64) => {
    const raw = base64.split(',')[1];
    const blob = await fetch(`data:image/png;base64,${raw}`).then(r => r.blob());
    const form = new FormData();
    form.append('image_file', blob, 'vehicle.png');
    form.append('size', 'auto');
    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': import.meta.env.VITE_REMOVE_BG_KEY || '' },
      body: form,
    });
    if (!res.ok) throw new Error('remove.bg failed — check your API key');
    const buf = await res.arrayBuffer();
    // Process in chunks to avoid call stack overflow on large images
    const bytes = new Uint8Array(buf);
    let b64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      b64 += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return `data:image/png;base64,${btoa(b64)}`;
  };

  const handleFile = async (vehicle, file, withRemoveBg) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      let imageData = e.target.result;
      setUploading(vehicle._id);
      try {
        if (withRemoveBg) {
          setRemoving(vehicle._id);
          imageData = await removeBg(imageData);
          setRemoving(null);
        }
        await api.put(`/vehicles/${vehicle._id}/image`, { image: imageData });
        setVehicles(vs => vs.map(v => v._id === vehicle._id ? { ...v, image: imageData } : v));
      } catch (err) {
        alert(err.message);
      } finally {
        setUploading(null);
        setRemoving(null);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-card border border-app rounded-xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 160px)' }}>
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-app flex-shrink-0">
        <ImageIcon size={14} className="text-blue-400" />
        <div>
          <p className="text-sm font-medium text-app">Vehicle Photos</p>
          <p className="text-xs text-gray-500">Upload a photo for each vehicle. Remove background before uploading for a cleaner look.</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-3">
        {vehicles.map(v => (
          <div key={v._id} className="bg-input border border-app rounded-xl overflow-hidden flex flex-col">
            {/* Image preview */}
            <div className="h-28 bg-black/30 flex items-center justify-center">
              {v.image
                ? <img src={v.image} alt={v.name} className="w-full h-full object-contain p-2" />
                : <Truck size={32} className="text-gray-700" />}
            </div>
            {/* Info */}
            <div className="px-3 py-2 flex-1">
              <p className="text-xs font-semibold text-app truncate">{v.name}</p>
              <p className="text-[10px] text-gray-500">{v.plate} · {v.type}</p>
            </div>
            {/* Upload buttons */}
            <div className="px-3 pb-3 flex flex-col gap-1.5">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={el => fileRefs.current[`${v._id}-normal`] = el}
                onChange={e => e.target.files[0] && handleFile(v, e.target.files[0], false)}
              />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={el => fileRefs.current[`${v._id}-removebg`] = el}
                onChange={e => e.target.files[0] && handleFile(v, e.target.files[0], true)}
              />
              <button
                type="button"
                disabled={uploading === v._id}
                onClick={() => fileRefs.current[`${v._id}-removebg`]?.click()}
                className="flex items-center justify-center gap-1.5 text-[10px] px-2 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition cursor-pointer disabled:opacity-50"
              >
                {removing === v._id ? (
                  <><span className="w-2.5 h-2.5 border border-blue-400 border-t-transparent rounded-full animate-spin" /> Removing BG...</>
                ) : uploading === v._id ? (
                  <><span className="w-2.5 h-2.5 border border-blue-400 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                ) : (
                  <><Upload size={10} /> Upload + Remove BG</>
                )}
              </button>
              <button
                type="button"
                disabled={uploading === v._id}
                onClick={() => fileRefs.current[`${v._id}-normal`]?.click()}
                className="flex items-center justify-center gap-1.5 text-[10px] px-2 py-1.5 rounded-lg bg-hover border border-app text-gray-400 hover:text-app transition cursor-pointer disabled:opacity-50"
              >
                <Upload size={10} /> Upload only
              </button>
            </div>
          </div>
        ))}
        {vehicles.length === 0 && !loading && (
            <p className="text-xs text-gray-500 col-span-2 text-center py-6">No vehicles found.</p>
          )}
        </div>
        )}
      </div>
      <div className="px-5 py-2.5 border-t border-app bg-input/20 flex items-center gap-1.5">
        <Info size={11} className="text-gray-500 flex-shrink-0" />
        <p className="text-[10px] text-gray-500">Remove BG requires a valid <span className="text-gray-400">VITE_REMOVE_BG_KEY</span> in your .env file.</p>
      </div>
    </div>
  );
}

function Settings({ onLogout }) {
  const { isDark, setTheme } = useTheme();
  const [showModal, setShowModal] = useState(false);

  // Rate config
  const [ratePerKm, setRatePerKm]     = useState({});
  const [minCharge, setMinCharge]     = useState({});
  const [editRates, setEditRates]     = useState(false);
  const [draftRates, setDraftRates]   = useState(null);
  const [savingRates, setSavingRates] = useState(false);
  const [ratesSaved, setRatesSaved]   = useState(false);

  useEffect(() => {
    api.get('/pricing/config')
      .then(data => { setRatePerKm(data.ratePerKm); setMinCharge(data.minCharge); })
      .catch(() => {});
  }, []);

  const startEdit = () => { setDraftRates({ ratePerKm: { ...ratePerKm }, minCharge: { ...minCharge } }); setEditRates(true); setRatesSaved(false); };
  const cancelEdit = () => { setEditRates(false); setDraftRates(null); };
  const saveRates = async () => {
    setSavingRates(true);
    try {
      const updated = await api.put('/pricing/config', draftRates);
      setRatePerKm(updated.ratePerKm); setMinCharge(updated.minCharge);
      setEditRates(false); setDraftRates(null); setRatesSaved(true);
      setTimeout(() => setRatesSaved(false), 2000);
    } catch (err) { alert(err.message); }
    finally { setSavingRates(false); }
  };

  const fmt = n => '₱' + Number(n || 0).toLocaleString('en-PH');

  return (
    <div className="w-full h-full">
      {showModal && <ChangePasswordModal onClose={() => setShowModal(false)} />}

      <div className="grid grid-cols-2 gap-4 items-start h-full">

        {/* Left column */}
        <div className="flex flex-col gap-4">

          {/* Dark mode */}
          <div className="bg-card border border-app rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDark ? <Moon size={15} className="text-blue-400" /> : <Sun size={15} className="text-yellow-400" />}
              <div>
                <p className="text-sm font-medium text-app">Dark Mode</p>
                <p className="text-xs text-gray-500">{isDark ? 'Currently on dark mode' : 'Currently on light mode'}</p>
              </div>
            </div>
            <button type="button" onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`relative w-12 h-7 rounded-full transition cursor-pointer border-none flex-shrink-0
                ${isDark ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-6 h-6 rounded-full shadow transition-all flex items-center justify-center bg-white
                ${isDark ? 'left-[22px]' : 'left-0.5'}`}>
                {isDark ? <Moon size={13} className="text-blue-600" /> : <Sun size={13} className="text-yellow-500" />}
              </span>
            </button>
          </div>

          {/* Change password */}
          <div className="bg-card border border-app rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <KeyRound size={15} className="text-blue-400" />
              <div>
                <p className="text-sm font-medium text-app">Password</p>
                <p className="text-xs text-gray-500">Update your account password</p>
              </div>
            </div>
            <button onClick={() => setShowModal(true)}
              className="text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer border-none">
              Change Password
            </button>
          </div>

          {/* Rate Schedule */}
          <div className="bg-card border border-app rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-app">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-app">Freight Rate Schedule</p>
                  <p className="text-xs text-gray-500">Rate per km and minimum charge per vehicle type</p>
                </div>
                {ratesSaved && <span className="text-xs text-green-400 ml-1">Saved!</span>}
              </div>
              {!editRates
                ? <button onClick={startEdit} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-input border border-app text-blue-400 hover:text-blue-300 cursor-pointer transition">
                    <Pencil size={11} /> Edit Rates
                  </button>
                : <div className="flex items-center gap-2">
                    <button onClick={cancelEdit} className="text-xs px-3 py-1.5 rounded-lg bg-hover border border-app text-gray-400 cursor-pointer transition">Cancel</button>
                    <button onClick={saveRates} disabled={savingRates}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border-none cursor-pointer transition disabled:opacity-50">
                      <Save size={11} /> {savingRates ? 'Saving...' : 'Save'}
                    </button>
                  </div>
              }
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-app">
                  <th className="text-left px-5 py-2 font-medium">Vehicle</th>
                  <th className="text-left px-5 py-2 font-medium">Rate / km</th>
                  <th className="text-left px-5 py-2 font-medium">Min Charge</th>
                </tr>
              </thead>
              <tbody>
                {VEHICLE_TYPES.map(v => (
                  <tr key={v} className="border-b border-subtle">
                    <td className="px-5 py-2.5 font-medium text-app">{v}</td>
                    <td className="px-5 py-2.5">
                      {editRates
                        ? <input type="number" min="1" value={draftRates.ratePerKm[v] ?? ''}
                            onChange={e => setDraftRates(d => ({ ...d, ratePerKm: { ...d.ratePerKm, [v]: e.target.value } }))}
                            className="w-24 bg-input border border-app rounded px-2 py-0.5 text-xs text-app outline-none focus:border-blue-500" />
                        : <span className="text-gray-300">{fmt(ratePerKm[v])}</span>}
                    </td>
                    <td className="px-5 py-2.5">
                      {editRates
                        ? <input type="number" min="1" value={draftRates.minCharge[v] ?? ''}
                            onChange={e => setDraftRates(d => ({ ...d, minCharge: { ...d.minCharge, [v]: e.target.value } }))}
                            className="w-24 bg-input border border-app rounded px-2 py-0.5 text-xs text-app outline-none focus:border-blue-500" />
                        : <span className="text-gray-300">{fmt(minCharge[v])}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-2.5 border-t border-app bg-input/20 flex items-center gap-1.5">
              <Info size={11} className="text-gray-500 flex-shrink-0" />
              <p className="text-[10px] text-gray-500">Changes apply to all new invoices going forward.</p>
            </div>
          </div>
        </div>

        {/* Right column — sticky, matches left column top, scrolls internally */}
        <div className="sticky top-0">
          <VehicleImageManager />
        </div>

      </div>
    </div>
  );
}

export default Settings;
