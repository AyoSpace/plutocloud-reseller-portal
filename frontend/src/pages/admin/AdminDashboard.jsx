import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Users, Server, DollarSign, Activity, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/admin/stats').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Admin Dashboard</h1><p className="text-slate-400 mt-1">Pluto Cloud Computing — Operations Overview</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: stats?.totalClients || 0, icon: Users, color: 'text-blue-400' },
          { label: 'Total Orders', value: stats?.totalOrders || 0, icon: Server, color: 'text-purple-400' },
          { label: 'Total Revenue', value: `₦${((stats?.totalRevenueKobo||0)/100).toLocaleString()}`, icon: DollarSign, color: 'text-green-400' },
          { label: 'Pending Provisioning', value: stats?.pendingProvisioning || 0, icon: Activity, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3"><p className="text-slate-400 text-sm">{s.label}</p><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { to: '/admin/orders', label: 'Manage Orders', desc: 'Provision VMs, view all orders', color: 'bg-blue-600 hover:bg-blue-700' },
          { to: '/admin/users', label: 'Manage Users', desc: 'View clients, upgrade to reseller', color: 'bg-purple-600 hover:bg-purple-700' },
          { to: '/admin/withdrawals', label: 'Withdrawals', desc: 'Process reseller withdrawals', color: 'bg-green-600 hover:bg-green-700' },
        ].map(a => (
          <Link key={a.to} to={a.to} className={`${a.color} rounded-xl p-5 block transition-colors`}>
            <p className="text-white font-semibold">{a.label}</p>
            <p className="text-white/70 text-sm mt-1">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = (status = '') => {
    setLoading(true);
    API.get(`/orders/admin/all${status ? `?status=${status}` : ''}`).then(r => setOrders(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const statusColor = { active: 'text-green-400', provisioning: 'text-yellow-400', pending_payment: 'text-slate-400', paid: 'text-blue-400', suspended: 'text-red-400' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">All Orders</h1><p className="text-slate-400 mt-1">Manage and provision customer VMs</p></div>
        <select value={filter} onChange={e => { setFilter(e.target.value); load(e.target.value); }}
          className="bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 text-sm">
          <option value="">All Status</option>
          {['pending_payment','paid','provisioning','active','suspended'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-700">{['Customer','VM','Specs','Total','Status','Actions'].map(h => <th key={h} className="text-left text-slate-400 text-xs font-medium px-6 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-700">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4"><p className="text-white text-sm font-medium">{o.first_name} {o.last_name}</p><p className="text-slate-400 text-xs">{o.user_email}</p></td>
                    <td className="px-6 py-4 text-slate-300 text-sm">{o.hostname}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{o.vcpu}C · {o.ram_gb}GB · {o.storage_gb}GB</td>
                    <td className="px-6 py-4 text-white text-sm font-medium">₦{(o.total_kobo/100).toLocaleString()}</td>
                    <td className="px-6 py-4"><span className={`text-sm font-medium ${statusColor[o.status]||'text-slate-400'}`}>{o.status}</span></td>
                    <td className="px-6 py-4">
                      {(o.status === 'paid' || o.status === 'provisioning') && (
                        <Link to={`/admin/orders/${o.id}/provision`} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium">Provision</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/admin/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  const makeReseller = async (id) => {
    try {
      await API.patch(`/admin/users/${id}/make-reseller`);
      toast.success('User upgraded to reseller');
      setUsers(users.map(u => u.id === id ? { ...u, role: 'reseller' } : u));
    } catch { toast.error('Failed to upgrade user'); }
  };

  const roleColor = { super_admin: 'bg-purple-600', finance_admin: 'bg-yellow-600', reseller: 'bg-green-600', client: 'bg-blue-600' };

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-white">Users</h1><p className="text-slate-400 mt-1">Manage clients and resellers</p></div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-700">{['Name','Email','Role','Verified','Joined','Actions'].map(h => <th key={h} className="text-left text-slate-400 text-xs font-medium px-6 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-700">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 text-white text-sm font-medium">{u.first_name} {u.last_name}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{u.email}</td>
                    <td className="px-6 py-4"><span className={`text-xs text-white px-2 py-1 rounded-full ${roleColor[u.role]||'bg-slate-600'}`}>{u.role}</span></td>
                    <td className="px-6 py-4">{u.is_email_verified ? <CheckCircle className="w-4 h-4 text-green-400" /> : <span className="text-slate-500 text-xs">No</span>}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {u.role === 'client' && (
                        <button onClick={() => makeReseller(u.id)} className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg">Make Reseller</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/reseller/admin/withdrawals').then(r => setWithdrawals(r.data)).finally(() => setLoading(false));
  }, []);

  const update = async (id, status) => {
    try {
      await API.patch(`/reseller/admin/withdrawals/${id}`, { status });
      toast.success(`Withdrawal marked as ${status}`);
      setWithdrawals(withdrawals.map(w => w.id === id ? { ...w, status } : w));
    } catch { toast.error('Update failed'); }
  };

  const statusColor = { pending: 'text-yellow-400', processing: 'text-blue-400', success: 'text-green-400', failed: 'text-red-400' };

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-white">Withdrawal Requests</h1><p className="text-slate-400 mt-1">Process reseller withdrawals</p></div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-700">{['Reseller','Amount','Bank','Account','Status','Actions'].map(h => <th key={h} className="text-left text-slate-400 text-xs font-medium px-6 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-700">
                {withdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4"><p className="text-white text-sm">{w.first_name} {w.last_name}</p><p className="text-slate-400 text-xs">{w.reseller_email}</p></td>
                    <td className="px-6 py-4 text-white font-medium text-sm">₦{(w.amount_kobo/100).toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{w.bank_name}</td>
                    <td className="px-6 py-4"><p className="text-white text-sm font-mono">{w.account_number}</p><p className="text-slate-400 text-xs">{w.account_name}</p></td>
                    <td className="px-6 py-4"><span className={`text-sm font-medium ${statusColor[w.status]||'text-slate-400'}`}>{w.status}</span></td>
                    <td className="px-6 py-4 flex gap-2">
                      {w.status === 'pending' && <button onClick={() => update(w.id, 'processing')} className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg">Processing</button>}
                      {w.status === 'processing' && <button onClick={() => update(w.id, 'success')} className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg">Mark Paid</button>}
                      {(w.status === 'pending' || w.status === 'processing') && <button onClick={() => update(w.id, 'failed')} className="text-xs bg-red-900 hover:bg-red-800 text-white px-3 py-1.5 rounded-lg">Failed</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProvisionVM() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [form, setForm] = useState({ vm_ip: '', vm_username: '', vm_password: '', vm_notes: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get(`/orders/${id}`).then(r => setOrder(r.data));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post(`/orders/${id}/provision`, form);
      toast.success('VM provisioned! Customer has been notified via email.');
      navigate('/admin/orders');
    } catch (err) { toast.error(err.response?.data?.error || 'Provisioning failed'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 font-mono";
  const labelClass = "block text-sm font-medium text-slate-300 mb-2";

  return (
    <div className="max-w-2xl">
      <div className="mb-6"><h1 className="text-2xl font-bold text-white">Provision VM</h1><p className="text-slate-400 mt-1">Enter the VM access details to notify the customer.</p></div>
      {order && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-3">Order Details</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[['Customer',order.user_email||''],['Hostname',order.hostname],['vCPU',`${order.vcpu} Core(s)`],['RAM',`${order.ram_gb} GB`],['Storage',`${order.storage_gb} GB`],['OS',order.os?.replace(/_/g,' ')]].map(([k,v]) => (
              <div key={k} className="flex gap-2"><span className="text-slate-400">{k}:</span><span className="text-white">{v}</span></div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className={labelClass}>VM IP Address</label><input type="text" required value={form.vm_ip} onChange={e => setForm({...form, vm_ip: e.target.value})} className={inputClass} placeholder="e.g. 41.215.100.50" /></div>
          <div><label className={labelClass}>Username</label><input type="text" required value={form.vm_username} onChange={e => setForm({...form, vm_username: e.target.value})} className={inputClass} placeholder="ubuntu / Administrator" /></div>
          <div><label className={labelClass}>Initial Password</label><input type="text" required value={form.vm_password} onChange={e => setForm({...form, vm_password: e.target.value})} className={inputClass} placeholder="Temporary password" /></div>
          <div><label className={labelClass}>Notes (optional)</label><textarea value={form.vm_notes} onChange={e => setForm({...form, vm_notes: e.target.value})} className={inputClass + ' resize-none'} rows={3} placeholder="Any additional info for the customer..." /></div>
          <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg">{loading ? 'Provisioning...' : '✅ Provision VM & Notify Customer'}</button>
        </form>
      </div>
    </div>
  );
}

export default AdminDashboard;
