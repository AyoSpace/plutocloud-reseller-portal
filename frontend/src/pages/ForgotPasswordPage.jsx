import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email });
      setSent(true);
    } catch { toast.error('Failed to send reset email'); }
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
          {sent ? (
            <div className="text-center"><div className="text-5xl mb-4">📧</div><h2 className="text-xl font-bold text-white mb-2">Check your email</h2><p className="text-slate-400 mb-6">If that email exists, we've sent a reset link.</p><Link to="/login" className="text-blue-400 hover:text-blue-300">Back to Login</Link></div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Reset Password</h2>
              <p className="text-slate-400 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                  placeholder="you@example.com" />
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center text-slate-400 text-sm mt-4"><Link to="/login" className="text-blue-400 hover:text-blue-300">Back to Login</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
