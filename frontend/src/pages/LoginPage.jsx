import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Cloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', form);
      if (data.require2FA) {
        sessionStorage.setItem('pluto_temp_token', data.tempToken);
        navigate('/2fa');
        return;
      }
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.first_name}!`);
      if (data.user.role === 'super_admin' || data.user.role === 'finance_admin') {
        navigate('/admin');
      } else if (data.user.role === 'reseller') {
        navigate('/reseller');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Cloud className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Pluto Cloud</h1>
          <p className="text-slate-400 mt-1">Reseller & Client Portal</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'} required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3.5 text-slate-400 hover:text-white">
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">Forgot password?</Link>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">Create account</Link>
          </p>
        </div>
        <p className="text-center text-slate-500 text-xs mt-6">
          © 2026 Pluto Cloud Computing. Enterprise cloud for Africa.
        </p>
      </div>
    </div>
  );
}
