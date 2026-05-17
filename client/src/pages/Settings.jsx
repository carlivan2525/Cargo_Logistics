import { useState } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Globe, Database, Save } from 'lucide-react';

const TABS = [
  { icon: User,        label: 'Profile' },
  { icon: Bell,        label: 'Notifications' },
  { icon: Shield,      label: 'Security' },
  { icon: Globe,       label: 'EDI Config' },
  { icon: Database,    label: 'System' },
];

function InputField({ label, value, onChange, type = 'text', disabled }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <div>
        <p className="text-sm text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition cursor-pointer border-none flex-shrink-0
          ${checked ? 'bg-blue-600' : 'bg-white/15'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all
          ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function Settings() {
  const [activeTab, setActiveTab] = useState('Profile');
  const [profile, setProfile] = useState({ name: 'Admin User', email: 'admin@cargo.ph', company: 'CarGO Logistics', role: 'Administrator' });
  const [notifs, setNotifs] = useState({ shipmentUpdates: true, ediAlerts: true, invoiceReminders: true, systemAlerts: false, emailDigest: true });
  const [ediConfig, setEdiConfig] = useState({ isaId: 'CARGO', isaQualifier: 'ZZ', gsId: 'CARGO', version: '00501', protocol: 'AS2', ackRequired: true });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex gap-4">
      {/* Sidebar tabs */}
      <div className="w-48 flex-shrink-0 bg-[#13151f] rounded-xl border border-white/10 p-2 h-fit">
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          <SettingsIcon size={13} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 tracking-widest">SETTINGS</span>
        </div>
        {TABS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={() => setActiveTab(label)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition cursor-pointer border-none
              ${activeTab === label ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:bg-white/8 hover:text-white'}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 bg-[#13151f] rounded-xl border border-white/10 p-6">
        {activeTab === 'Profile' && (
          <div className="space-y-4 max-w-md">
            <p className="text-sm font-semibold text-white mb-4">Profile Settings</p>
            <InputField label="Full Name" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            <InputField label="Email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} type="email" />
            <InputField label="Company" value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))} />
            <InputField label="Role" value={profile.role} disabled />
            <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition cursor-pointer border-none font-medium mt-2">
              <Save size={13} /> {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        )}

        {activeTab === 'Notifications' && (
          <div className="max-w-md">
            <p className="text-sm font-semibold text-white mb-4">Notification Preferences</p>
            <Toggle label="Shipment Updates" description="Get notified on status changes" checked={notifs.shipmentUpdates} onChange={v => setNotifs(n => ({ ...n, shipmentUpdates: v }))} />
            <Toggle label="EDI Alerts" description="Transmission failures and warnings" checked={notifs.ediAlerts} onChange={v => setNotifs(n => ({ ...n, ediAlerts: v }))} />
            <Toggle label="Invoice Reminders" description="Overdue and upcoming due dates" checked={notifs.invoiceReminders} onChange={v => setNotifs(n => ({ ...n, invoiceReminders: v }))} />
            <Toggle label="System Alerts" description="Server and database notifications" checked={notifs.systemAlerts} onChange={v => setNotifs(n => ({ ...n, systemAlerts: v }))} />
            <Toggle label="Daily Email Digest" description="Summary of daily activity" checked={notifs.emailDigest} onChange={v => setNotifs(n => ({ ...n, emailDigest: v }))} />
            <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition cursor-pointer border-none font-medium mt-4">
              <Save size={13} /> {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        )}

        {activeTab === 'Security' && (
          <div className="space-y-4 max-w-md">
            <p className="text-sm font-semibold text-white mb-4">Security Settings</p>
            <InputField label="Current Password" value="" onChange={() => {}} type="password" />
            <InputField label="New Password" value="" onChange={() => {}} type="password" />
            <InputField label="Confirm New Password" value="" onChange={() => {}} type="password" />
            <div className="pt-2 border-t border-white/10">
              <Toggle label="Two-Factor Authentication" description="Require 2FA on login" checked={false} onChange={() => {}} />
              <Toggle label="Session Timeout" description="Auto-logout after 30 minutes of inactivity" checked={true} onChange={() => {}} />
            </div>
            <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition cursor-pointer border-none font-medium">
              <Save size={13} /> {saved ? 'Saved!' : 'Update Password'}
            </button>
          </div>
        )}

        {activeTab === 'EDI Config' && (
          <div className="space-y-4 max-w-md">
            <p className="text-sm font-semibold text-white mb-4">EDI Configuration</p>
            <InputField label="ISA Sender ID" value={ediConfig.isaId} onChange={e => setEdiConfig(c => ({ ...c, isaId: e.target.value }))} />
            <InputField label="ISA Qualifier" value={ediConfig.isaQualifier} onChange={e => setEdiConfig(c => ({ ...c, isaQualifier: e.target.value }))} />
            <InputField label="GS Sender ID" value={ediConfig.gsId} onChange={e => setEdiConfig(c => ({ ...c, gsId: e.target.value }))} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400">EDI Version</label>
              <select
                value={ediConfig.version}
                onChange={e => setEdiConfig(c => ({ ...c, version: e.target.value }))}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-blue-500 transition cursor-pointer"
              >
                <option value="00501">ANSI X12 005010 (00501)</option>
                <option value="00401">ANSI X12 004010 (00401)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400">Default Protocol</label>
              <select
                value={ediConfig.protocol}
                onChange={e => setEdiConfig(c => ({ ...c, protocol: e.target.value }))}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-blue-500 transition cursor-pointer"
              >
                {['AS2','SFTP','VAN','FTP'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Toggle label="Require Functional Acknowledgment (997)" description="Expect 997 for all outbound docs" checked={ediConfig.ackRequired} onChange={v => setEdiConfig(c => ({ ...c, ackRequired: v }))} />
            <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition cursor-pointer border-none font-medium">
              <Save size={13} /> {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        )}

        {activeTab === 'System' && (
          <div className="space-y-4 max-w-md">
            <p className="text-sm font-semibold text-white mb-4">System Information</p>
            {[
              { label: 'Application Version', value: 'v1.0.0' },
              { label: 'Database', value: 'MongoDB Atlas' },
              { label: 'Environment', value: 'Production' },
              { label: 'Node.js Version', value: 'v20.x' },
              { label: 'Last Backup', value: 'May 17, 2026 02:00 AM' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs text-white font-medium">{value}</span>
              </div>
            ))}
            <div className="pt-2">
              <Toggle label="Maintenance Mode" description="Disable access for non-admin users" checked={false} onChange={() => {}} />
              <Toggle label="Debug Logging" description="Enable verbose EDI debug logs" checked={false} onChange={() => {}} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
