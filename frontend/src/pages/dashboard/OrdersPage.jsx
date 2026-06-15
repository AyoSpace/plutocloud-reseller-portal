import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Server, ExternalLink, RefreshCw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

const statusColor = { active: 'bg-green-500', provisioning: 'bg-yellow-500', pending_payment: 'bg-slate-500', paid: 'bg-blue-500', suspended: 'bg-red-500', terminated: 'bg-slate-600' };
const statusLabel = { active: 'Active', provisioning: 'Provisioning', pending_payment: 'Awaiting Payment', paid: 'Processing', suspended: 'Suspended', terminated: 'Terminated' };

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/orders').then(r => setOrders(r.data)).finally(() => setLoading(false));
  }, []);

  const retryPayment = async (orderId) => {
    try {
      const { data } = await API.post(`/orders/${orderId}/retry-payment`);
      if (data.authorization_url) window.location.href = data.authorization_url;
    } catch { toast.error('Failed to retry payment'); }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await API.delete(`/orders/${orderId}`);
      toast.success('Order cancelled');
      setOrders(orders.filter(o => o.id !== orderId));
    } catch { toast.error('Failed to cancel order'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-white">My VMs</h1><p className="text-slate-400 mt-1">All your virtual machines</p></div>
        <Link to="/dashboard/new-order" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ New VM</Link>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center"><Server className="w-16 h-16 text-slate-600 mx-auto mb-4" /><p className="text-slate-400 text-lg">No VMs deployed yet</p><Link to="/dashboard/new-order" className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-semibold">Deploy your first VM</Link></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-700">{['VM / Hostname','Specs','OS','Monthly Cost','Status','Actions'].map(h => <th key={h} className="text-left text-slate-400 text-xs font-medium px-6 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-700">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4"><p className="text-white font-medium text-sm">{o.hostname}</p><p className="text-slate-500 text-xs">{o.order_ref}</p></td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{o.vcpu} vCPU · {o.ram_gb}GB · {o.storage_gb}GB</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{o.os?.replace(/_/g,' ')}</td>
                    <td className="px-6 py-4 text-white text-sm font-medium">₦{(o.total_kobo/100).toLocaleString()}</td>
                    <td className="px-6 py-4"><span className={`inline-flex text-xs text-white px-2 py-1 rounded-full ${statusColor[o.status]||'bg-slate-600'}`}>{statusLabel[o.status]||o.status}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link to={`/dashboard/orders/${o.id}`} className="text-blue-400 hover:text-blue-300 text-sm">Details</Link>
                        {o.status === 'pending_payment' && (
                          <>
                            <button onClick={() => retryPayment(o.id)} className="inline-flex items-center gap-1 text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded">
                              <RefreshCw className="w-3 h-3" />Retry
                            </button>
                            <button onClick={() => cancelOrder(o.id)} className="inline-flex items-center gap-1 text-xs bg-red-900 hover:bg-red-800 text-white px-2 py-1 rounded">
                              <XCircle className="w-3 h-3" />Cancel
                            </button>
                          </>
                        )}
                      </div>
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
