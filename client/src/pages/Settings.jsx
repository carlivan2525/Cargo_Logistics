import { useState } from 'react';
import { Shield, Save } from 'lucide-react';
import { api } from '../api';

function InputField({ label, value, onChange, type = 'text', error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-secondary-app">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="px-3 py-2 bg-input border border-app rounded-lg text-sm text-app placeholder:text-muted-app outline-none focus:border-blue-500 transition"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function Settings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handlePasswordUpdate = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-md text-left">
    <div className="bg-card rounded-xl border border-app p-6">
        <div className="flex items-center gap-2 mb-5">
          <Shield size={16} className="text-blue-400" />
          <p className="text-sm font-semibold text-app">Change Password</p>
        </div>

        <div className="space-y-4">
          <InputField label="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type="password" />
          <InputField label="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" />
          <InputField label="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" error={passwordError} />
          {passwordSuccess && (
            <p className="text-xs text-green-500">Password updated successfully.</p>
          )}
          <button
            type="button"
            onClick={handlePasswordUpdate}
            disabled={passwordSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition cursor-pointer border-none font-medium disabled:opacity-50"
          >
            <Save size={13} /> {passwordSaving ? 'Updating...' : passwordSuccess ? 'Updated!' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
