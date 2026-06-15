import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { Shield, Mail, ExternalLink } from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '', phone: user?.phone || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.patch('/auth/profile', form);
      toast.success('Profile updated');
    } catch { toast.error('Update failed'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-slate-300 mb-2";

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-white mb-6">Profile Settings</h1>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div><p className="text-white font-semibold text-lg">{user?.first_name} {user?.last_name}</p><p className="text-slate-400 text-sm">{user?.email}</p></div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>First Name</label><input type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>Last Name</label><input type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className={inputClass} /></div>
          </div>
          <div><label className={labelClass}>Phone</label><input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inputClass} /></div>
          <div><label className={labelClass}>Email</label><input type="email" value={user?.email} disabled className={inputClass + ' opacity-50 cursor-not-allowed'} /></div>
          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg">{loading ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>
    </div>
  );
}

export function SecurityPage() {
  const { user } = useAuth();
  const [qr, setQr] = useState(null);
  const [code, setCode] = useState('');
  const [step, setStep] = useState('idle');
  const [loading, setLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', password: '', confirm: '' });

  const setup2FA = async () => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/setup-2fa');
      setQr(data.qrCode);
      setStep('scan');
    } catch { toast.error('Failed to setup 2FA'); }
    finally { setLoading(false); }
  };

  const confirm2FA = async () => {
    setLoading(true);
    try {
      await API.post('/auth/confirm-2fa', { code });
      toast.success('2FA enabled successfully!');
      setStep('done');
    } catch { toast.error('Invalid code'); }
    finally { setLoading(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.password !== pwForm.confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await API.post('/auth/change-password', pwForm);
      toast.success('Password changed');
      setPwForm({ current: '', password: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500";

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Security Settings</h1>

      {/* 2FA */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-blue-400" />
          <h2 className="text-white font-semibold">Two-Factor Authentication</h2>
          {user?.totp_enabled && <span className="ml-auto bg-green-900/40 text-green-400 text-xs px-2 py-1 rounded-full border border-green-700">Enabled</span>}
        </div>
        {user?.totp_enabled ? (
          <p className="text-slate-400 text-sm">2FA is active on your account. Use Google Authenticator to generate login codes.</p>
        ) : step === 'idle' ? (
          <>
            <p className="text-slate-400 text-sm mb-4">Add an extra layer of security with Google Authenticator.</p>
            <button onClick={setup2FA} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">{loading ? 'Setting up...' : 'Enable 2FA'}</button>
          </>
        ) : step === 'scan' ? (
          <>
            <p className="text-slate-300 text-sm mb-4">Scan this QR code with Google Authenticator, then enter the 6-digit code:</p>
            {qr && <img src={qr} alt="QR Code" className="mx-auto mb-4 rounded-lg" width={200} />}
            <div className="flex gap-3">
              <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="000000" maxLength={6} className={inputClass + ' text-center tracking-widest text-xl'} />
              <button onClick={confirm2FA} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-lg font-semibold whitespace-nowrap">{loading ? '...' : 'Confirm'}</button>
            </div>
          </>
        ) : (
          <p className="text-green-400">✅ 2FA has been enabled. Please log out and back in to use it.</p>
        )}
      </div>

      {/* Change password */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div><label className="block text-sm text-slate-300 mb-2">Current Password</label><input type="password" value={pwForm.current} onChange={e => setPwForm({...pwForm, current: e.target.value})} className={inputClass} required /></div>
          <div><label className="block text-sm text-slate-300 mb-2">New Password</label><input type="password" value={pwForm.password} onChange={e => setPwForm({...pwForm, password: e.target.value})} className={inputClass} required /></div>
          <div><label className="block text-sm text-slate-300 mb-2">Confirm New Password</label><input type="password" value={pwForm.confirm} onChange={e => setPwForm({...pwForm, confirm: e.target.value})} className={inputClass} required /></div>
          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg">{loading ? 'Changing...' : 'Change Password'}</button>
        </form>
      </div>
    </div>
  );
}

export function SupportPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Support</h1>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
        <Mail className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h2 className="text-white text-xl font-semibold mb-2">Contact Support</h2>
        <p className="text-slate-400 mb-6">Send us an email and our team will respond within 24 hours.</p>
        <a href="mailto:noc@plutocloudcomputing.ng?subject=Support Request"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
          <Mail className="w-5 h-5" />
          Email Support
          <ExternalLink className="w-4 h-4" />
        </a>
        <p className="text-slate-500 text-sm mt-4">noc@plutocloudcomputing.ng</p>
      </div>
    </div>
  );
}

export default ProfilePage;
