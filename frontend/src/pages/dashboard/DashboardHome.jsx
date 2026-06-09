import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Server, Plus, DollarSign, Activity } from 'lucide-react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function DashboardHome() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/orders').then(r => setOrders(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const active = orders.filter(o => o.status === 'active').length;
  const pending = orders.filter(o => ['pending_payment', 'paid', 'provisioning'].includes(o.status)).length;
  const totalSpend = orders.filter(o => o.status === 'active').reduce((s, o) => s + o.total_kobo, 0);

  const statusColor = { active: 'bg-green-500', provisioning: 'bg-yellow-500', pending_payment: 'bg-slate-500', paid: 'bg-blue-500', suspended: 'bg-red-500', terminated: 'bg-slate-600' };
  const statusLabel = { active: 'Active', provisioning: 'Provisioning', pending_payment: 'Awaiting Payment', paid: 'Paid — Provisioning Soon', suspended: 'Suspended', terminated: 'Terminated' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back, {user?.first_name}! 👋</h1>
        <p className="text-slate-400 mt-1">Here's an overview of your cloud resources.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active VMs', value: active, icon: Server, color: 'text-green-400' },
          { label: 'Pending Orders', value: pending, icon: Activity, color: 'text-yellow-400' },
          { label: 'Monthly Spend', value: `₦${(totalSpend / 100).toLocaleString()}`, icon: DollarSign, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-400 text-sm">{s.label}</p>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick action */}
      <Link to="/dashboard/new-order"
        className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-semibold transition-colors w-fit">
        <Plus className="w-5 h-5" />
        Deploy New VM
      </Link>

      {/* Recent orders */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-white font-semibold">Recent Orders</h2>
          <Link to="/dashboard/orders" className="text-blue-400 hover:text-blue-300 text-sm">View all</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No orders yet</p>
            <Link to="/dashboard/new-order" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">Deploy your first VM</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {orders.slice(0, 5).map(o => (
              <Link key={o.id} to={`/dashboard/orders/${o.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-700/50 transition-colors">
                <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center">
                  <Server className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{o.hostname}</p>
                  <p className="text-slate-400 text-xs">{o.vcpu} vCPU • {o.ram_gb}GB RAM • {o.storage_gb}GB SSD</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-medium">₦{(o.total_kobo / 100).toLocaleString()}</p>
                  <span className={`inline-flex items-center gap-1 text-xs text-white px-2 py-0.5 rounded-full ${statusColor[o.status] || 'bg-slate-600'}`}>
                    {statusLabel[o.status] || o.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
