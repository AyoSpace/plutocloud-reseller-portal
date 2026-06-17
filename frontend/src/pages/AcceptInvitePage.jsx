import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', password: '', confirm_password: '' });

  useEffect(() => {
    if (!token) { setError('No invite token provided'); setLoading(false); return; }
    API.get(`/admin/invite/${token}`)
      .then(r => setInvite(r.data))
      .catch(err => setError(err.response?.data?.error || 'Invalid invite link'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) return toast.error('Passwords do not match');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setSubmitting(true);
    try {
      await API.post('/admin/accept-invite', { token, first_name: form.first_name, last_name: form.last_name, password: form.password });
      toast.success('Account created! You can now log in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = { super_admin: 'Super Admin', finance_admin: 'Finance Admin' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/pluto-logo.svg" alt="Pluto Cloud Computing" className="h-20 mx-auto" />
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="h-1 bg-red-600 rounded-full mb-6 w-16"></div>
          {loading ? (
            <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div></div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-400 font-medium mb-2">{error}</p>
              <Link to="/login" className="text-red-400 hover:text-red-300 text-sm">Return to login</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-1">Accept your invitation</h2>
              <p className="text-slate-400 text-sm mb-6">
                You've been invited as <strong className="text-white">{roleLabel[invite.role]}</strong> for <strong className="text-white">{invite.email}</strong>
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" required placeholder="First name" value={form.first_name}
                    onChange={e => setForm({ ...form, first_name: e.target.value })}
                    className="bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500" />
                  <input type="text" required placeholder="Last name" value={form.last_name}
                    onChange={e => setForm({ ...form, last_name: e.target.value })}
                    className="bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500" />
                </div>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} required placeholder="Create password" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-red-500" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3.5 text-slate-400 hover:text-white">
                    {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <input type={show ? 'text' : 'password'} required placeholder="Confirm password" value={form.confirm_password}
                  onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500" />
                <button type="submit" disabled={submitting}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-semibold py-3 rounded-lg transition-colors">
                  {submitting ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
