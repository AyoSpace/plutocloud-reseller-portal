import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Cloud } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '',
    reseller_code: searchParams.get('ref') || ''
  });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) return toast.error('Passwords do not match');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await API.post('/auth/register', form);
      toast.success('Account created! A verification email has been sent to ' + form.email + '. Please check your inbox.', { duration: 6000 });
      setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const f = (field) => ({ value: form[field], onChange: e => setForm({ ...form, [field]: e.target.value }) });
  const inputClass = "w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500";
  const labelClass = "block text-sm font-medium text-slate-300 mb-2";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Cloud className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Pluto Cloud</h1>
          <p className="text-slate-400 mt-1">Create your account</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First Name</label>
                <input type="text" required {...f('first_name')} className={inputClass} placeholder="John" />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input type="text" required {...f('last_name')} className={inputClass} placeholder="Doe" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input type="email" required {...f('email')} className={inputClass} placeholder="john@example.com" />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input type="tel" {...f('phone')} className={inputClass} placeholder="+234 800 000 0000" />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} required {...f('password')} className={inputClass + ' pr-12'} placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3.5 text-slate-400 hover:text-white">
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Confirm Password</label>
              <input type="password" required {...f('confirm_password')} className={inputClass} placeholder="Repeat password" />
            </div>
            {searchParams.get('ref') && (
              <div>
                <label className={labelClass}>Reseller Code</label>
                <input type="text" {...f('reseller_code')} className={inputClass + ' bg-slate-600'} readOnly />
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-semibold py-3 rounded-lg transition-colors mt-2">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-red-400 hover:text-red-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
