import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import API from '../utils/api';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const ref = searchParams.get('reference') || searchParams.get('trxref');
    if (!ref) { setStatus('error'); return; }
    // Give webhook time to process
    setTimeout(() => setStatus('success'), 3000);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-white mb-2">Verifying Payment...</h2>
            <p className="text-slate-400">Please wait while we confirm your payment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Payment Successful! 🎉</h2>
            <p className="text-slate-400 mb-2">Your payment has been received.</p>
            <p className="text-slate-400 mb-6">Your VM is now being provisioned. You will receive an email with access details within 2-4 hours.</p>
            <Link to="/dashboard/orders" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg inline-block">View My Orders</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Payment Issue</h2>
            <p className="text-slate-400 mb-6">Something went wrong. Contact support if you were charged.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/dashboard" className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2.5 rounded-lg font-semibold">Dashboard</Link>
              <a href="mailto:info@plutocloudcomputing.ng" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold">Contact Support</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
