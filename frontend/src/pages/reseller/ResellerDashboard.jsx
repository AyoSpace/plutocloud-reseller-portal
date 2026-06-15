import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, DollarSign, Wallet, TrendingUp, ArrowDownCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

export function ResellerDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/reseller/dashboard').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reseller Dashboard</h1>
        <p className="text-slate-400 mt-1">Track your clients, earnings and withdrawals.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: stats?.totalClients || 0, icon: Users, color: 'text-blue-400' },
          { label: 'Total Earnings', value: `₦${((stats?.totalEarningsKobo||0)/100).toLocaleString()}`, icon: TrendingUp, color: 'text-green-400' },
          { label: 'Available Balance', value: `₦${((stats?.availableEarningsKobo||0)/100).toLocaleString()}`, icon: DollarSign, color: 'text-yellow-400' },
          { label: 'Withdrawn', value: `₦${((stats?.withdrawnEarningsKobo||0)/100).toLocaleString()}`, icon: Wallet, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3"><p className="text-slate-400 text-sm">{s.label}</p><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-2">
        <p className="text-slate-400 text-sm mb-2">Your Referral Link</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-slate-700 text-blue-300 px-3 py-2 rounded text-sm font-mono break-all">
            {`https://portal.plutocloudcomputing.ng/register?ref=${stats?.resellerCode || ''}`}
          </code>
          <button onClick={() => { navigator.clipboard.writeText(`https://portal.plutocloudcomputing.ng/register?ref=${stats?.resellerCode}`); toast.success('Referral link copied!'); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm whitespace-nowrap">Copy Link</button>
        </div>
        <p className="text-slate-500 text-xs mt-2">Share this link — clients who register earn you 20% commission on every order</p>
      </div>
      <div className="flex gap-3">
        <Link to="/reseller/withdraw" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2"><ArrowDownCircle className="w-4 h-4" />Request Withdrawal</Link>
        <Link to="/reseller/clients" className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2"><Users className="w-4 h-4" />View Clients</Link>
      </div>
      {stats?.recentOrders?.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl">
          <div className="px-6 py-4 border-b border-slate-700"><h2 className="text-white font-semibold">Recent Client Orders</h2></div>
          <div className="divide-y divide-slate-700">
            {stats.recentOrders.map((o, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div><p className="text-white text-sm">{o.client_email}</p><p className="text-slate-400 text-xs">{o.order_ref}</p></div>
                <div className="text-right"><p className="text-white text-sm font-medium">₦{(o.total_kobo/100).toLocaleString()}</p><span className="text-xs text-slate-400">{o.status}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ResellerClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/reseller/clients').then(r => setClients(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Clients</h1>
        <p className="text-slate-400 mt-1">Clients who signed up using your referral link.</p>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
        : clients.length === 0 ? <div className="p-12 text-center text-slate-400">No clients yet. Share your referral link to get clients.</div>
        : (
          <table className="w-full">
            <thead><tr className="border-b border-slate-700">{['Name','Email','VMs','Joined'].map(h => <th key={h} className="text-left text-slate-400 text-xs font-medium px-6 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-700">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-white text-sm">{c.first_name} {c.last_name}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{c.email}</td>
                  <td className="px-6 py-4 text-white text-sm">{c.vm_count}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function ResellerEarnings() {
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/reseller/earnings').then(r => setEarnings(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-white">Earnings History</h1><p className="text-slate-400 mt-1">20% commission on every client VM order.</p></div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
        : earnings.length === 0 ? <div className="p-12 text-center text-slate-400">No earnings yet.</div>
        : (
          <table className="w-full">
            <thead><tr className="border-b border-slate-700">{['Client','Order','Earning','Status','Date'].map(h => <th key={h} className="text-left text-slate-400 text-xs font-medium px-6 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-700">
              {earnings.map(e => (
                <tr key={e.id} className="hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-slate-400 text-sm">{e.client_email}</td>
                  <td className="px-6 py-4 text-white text-sm">{e.order_ref}</td>
                  <td className="px-6 py-4 text-green-400 font-medium text-sm">₦{(e.amount_kobo/100).toLocaleString()}</td>
                  <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded-full ${e.status==='available'?'bg-green-900/40 text-green-400':e.status==='withdrawn'?'bg-slate-700 text-slate-400':'bg-yellow-900/40 text-yellow-400'}`}>{e.status}</span></td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{new Date(e.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function ResellerWithdraw() {
  const [form, setForm] = useState({ amount_kobo: '', bank_name: '', account_number: '', account_name: '' });
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get('/reseller/dashboard').then(r => setBalance(r.data.availableEarningsKobo || 0));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = Math.round(parseFloat(form.amount_kobo) * 100);
    if (amount < 1000000) return toast.error('Minimum withdrawal is ₦10,000');
    setLoading(true);
    try {
      await API.post('/reseller/withdraw', { ...form, amount_kobo: amount });
      toast.success('Withdrawal request submitted! You will be notified within 1-2 business days.');
      setForm({ amount_kobo: '', bank_name: '', account_number: '', account_name: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Withdrawal failed'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-slate-300 mb-2";

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-white mb-2">Request Withdrawal</h1>
      <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 mb-6">
        <p className="text-slate-400 text-sm">Available Balance</p>
        <p className="text-3xl font-bold text-green-400">₦{(balance/100).toLocaleString()}</p>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className={labelClass}>Amount (NGN) — Min. ₦10,000</label><input type="number" min="10000" required value={form.amount_kobo} onChange={e => setForm({...form, amount_kobo: e.target.value})} className={inputClass} placeholder="e.g. 50000" /></div>
          <div><label className={labelClass}>Bank Name</label><input type="text" required value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} className={inputClass} placeholder="e.g. GTBank" /></div>
          <div><label className={labelClass}>Account Number</label><input type="text" required maxLength={10} value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} className={inputClass} placeholder="0123456789" /></div>
          <div><label className={labelClass}>Account Name</label><input type="text" required value={form.account_name} onChange={e => setForm({...form, account_name: e.target.value})} className={inputClass} placeholder="John Doe" /></div>
          <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg">{loading ? 'Submitting...' : 'Submit Withdrawal Request'}</button>
        </form>
      </div>
    </div>
  );
}

export default ResellerDashboard;
