import { useState } from 'react';
import { Shield, Save, Eye, EyeOff, Moon, Sun, KeyRound, X, LogOut } from 'lucide-react';
import { api } from '../api';
import { useTheme } from '../context/ThemeContext';

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
          <Field label="Current Password" value={current} onChange={setCurrent} show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
          <Field label="New Password"     value={newPass} onChange={setNewPass} show={showNew}     onToggle={() => setShowNew(v => !v)} />
          <Field label="Confirm Password" value={confirm} onChange={setConfirm} show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />

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

function Settings({ onLogout }) {
  const { isDark, setTheme } = useTheme();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="w-full max-w-md space-y-4">
      {showModal && <ChangePasswordModal onClose={() => setShowModal(false)} />}

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

      {/* Logout */}
      <div className="bg-card border border-red-500/20 rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogOut size={15} className="text-red-400" />
          <div>
            <p className="text-sm font-medium text-app">Logout</p>
            <p className="text-xs text-gray-500">Sign out of your account</p>
          </div>
        </div>
        <button onClick={onLogout}
          className="text-xs px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition cursor-pointer font-medium">
          Logout
        </button>
      </div>
    </div>
  );
}

export default Settings;
