import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Server, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

export function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/orders/${id}`).then(r => setOrder(r.data)).finally(() => setLoading(false));
  }, [id]);

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };
  const statusColor = { active: 'text-green-400 bg-green-900/30', provisioning: 'text-yellow-400 bg-yellow-900/30', pending_payment: 'text-slate-400 bg-slate-700', paid: 'text-blue-400 bg-blue-900/30' };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div></div>;
  if (!order) return <div className="text-center text-slate-400 mt-20">Order not found</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-900/40 border border-blue-700 rounded-lg flex items-center justify-center"><Server className="w-5 h-5 text-blue-400" /></div>
        <div><h1 className="text-2xl font-bold text-white">{order.hostname}</h1><p className="text-slate-400 text-sm">{order.order_ref}</p></div>
        <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${statusColor[order.status]||'text-slate-400 bg-slate-700'}`}>{order.status}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">VM Specifications</h3>
          {[['vCPU', `${order.vcpu} Cores`],['RAM', `${order.ram_gb} GB`],['Storage', `${order.storage_gb} GB HDD`],['OS', order.os?.replace(/_/g,' ')],['Plan', order.plan_name]].map(([k,v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-slate-700 last:border-0 text-sm"><span className="text-slate-400">{k}</span><span className="text-white">{v}</span></div>
          ))}
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Billing</h3>
          {[['Base Price',`₦${(order.base_price_kobo/100).toLocaleString()}`],['VAT (7.5%)',`₦${(order.vat_kobo/100).toLocaleString()}`],['Total',`₦${(order.total_kobo/100).toLocaleString()}`],['Next Billing', order.next_billing_date ? new Date(order.next_billing_date).toLocaleDateString() : '—']].map(([k,v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-slate-700 last:border-0 text-sm"><span className="text-slate-400">{k}</span><span className="text-white font-medium">{v}</span></div>
          ))}
        </div>
        {order.status === 'active' && order.vm_ip && (
          <div className="md:col-span-2 bg-green-900/20 border border-green-700 rounded-xl p-5">
            <h3 className="text-green-400 font-semibold mb-4">🖥️ Access Details</h3>
            {[['IP Address', order.vm_ip],['Username', order.vm_username]].map(([k,v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-green-900 last:border-0 text-sm">
                <span className="text-slate-400">{k}</span>
                <div className="flex items-center gap-2"><span className="text-white font-mono">{v}</span><button onClick={() => copy(v)} className="text-slate-400 hover:text-white"><Copy className="w-4 h-4" /></button></div>
              </div>
            ))}
            <p className="text-slate-500 text-xs mt-3">⚠️ Password was sent to your email. Change it immediately after first login.</p>
          </div>
        )}
        {order.status === 'provisioning' && (
          <div className="md:col-span-2 bg-yellow-900/20 border border-yellow-700 rounded-xl p-5 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-3"></div>
            <p className="text-yellow-400 font-medium">Your VM is being provisioned</p>
            <p className="text-slate-400 text-sm mt-1">You will receive an email with access details once ready (usually within 2-4 hours).</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderDetailPage;
