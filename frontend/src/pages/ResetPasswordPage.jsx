import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Cloud } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await API.post('/auth/reset-password', { token: searchParams.get('token'), password: form.password });
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.error || 'Reset failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4"><Cloud className="w-8 h-8 text-white" /></div>
          <h1 className="text-3xl font-bold text-white">Pluto Cloud</h1>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Set New Password</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
              <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                placeholder="Min. 8 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
              <input type="password" required value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                placeholder="Repeat password" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function TwoFactorPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tempToken = sessionStorage.getItem('pluto_temp_token');
    if (!tempToken) { navigate('/login'); return; }
    setLoading(true);
    try {
      const { data } = await API.post('/auth/verify-2fa', { tempToken, code });
      sessionStorage.removeItem('pluto_temp_token');
      login(data.token, data.user);
      toast.success('Welcome back!');
      if (data.user.role === 'super_admin' || data.user.role === 'finance_admin') navigate('/admin');
      else if (data.user.role === 'reseller') navigate('/reseller');
      else navigate('/dashboard');
    } catch (err) { toast.error(err.response?.data?.error || 'Invalid code'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4"><Cloud className="w-8 h-8 text-white" /></div>
          <h1 className="text-3xl font-bold text-white">Two-Factor Authentication</h1>
          <p className="text-slate-400 mt-1">Enter the code from your authenticator app</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" required value={code} onChange={e => setCode(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-4 text-center text-2xl tracking-widest focus:outline-none focus:border-blue-500"
              placeholder="000000" maxLength={6} />
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg">
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-4"><Link to="/login" className="text-blue-400 hover:text-blue-300">Use a different account</Link></p>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
