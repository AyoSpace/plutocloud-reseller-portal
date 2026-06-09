// VerifyEmailPage.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Cloud, CheckCircle, XCircle } from 'lucide-react';
import API from '../utils/api';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setStatus('error'); return; }
    API.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
          <Cloud className="w-8 h-8 text-white" />
        </div>
        {status === 'verifying' && <><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto my-6"></div><p className="text-slate-300">Verifying your email...</p></>}
        {status === 'success' && <><CheckCircle className="w-16 h-16 text-green-400 mx-auto my-4" /><h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2><p className="text-slate-400 mb-6">Your account is now active.</p><Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">Sign In</Link></>}
        {status === 'error' && <><XCircle className="w-16 h-16 text-red-400 mx-auto my-4" /><h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2><p className="text-slate-400 mb-6">Invalid or expired link.</p><Link to="/login" className="text-blue-400 hover:text-blue-300">Back to Login</Link></>}
      </div>
    </div>
  );
}
export default VerifyEmailPage;
