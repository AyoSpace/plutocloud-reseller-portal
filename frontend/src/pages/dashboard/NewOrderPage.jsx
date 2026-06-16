import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Cpu, HardDrive, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const OS_OPTIONS = [
  { value: 'ubuntu_22', label: 'Ubuntu 22.04 LTS', free: true },
  { value: 'centos_8', label: 'CentOS 8', free: true },
  { value: 'windows_server_2019', label: 'Windows Server 2019', free: false },
];

export default function NewOrderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [config, setConfig] = useState({ vcpu: 2, ram_gb: 4, storage_gb: 50, os: 'ubuntu_22', hostname: '' });
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    API.get('/orders/plans').then(r => {
      setPlans(r.data);
      if (r.data[0]) setSelectedPlan(r.data[0]);
    });
  }, []);

  useEffect(() => {
    if (!config.vcpu || !config.ram_gb || !config.storage_gb || !config.os) return;
    setLoading(true);
    const timer = setTimeout(() => {
      API.post('/orders/calculate-price', config)
        .then(r => setPricing(r.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [config]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return toast.error('Please select a plan');
    setSubmitting(true);
    try {
      const { data } = await API.post('/orders', { ...config, plan_id: selectedPlan.id });
      window.location.href = data.paymentUrl;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create order');
      setSubmitting(false);
    }
  };

  const isReseller = user?.role === 'reseller';
  const plan = selectedPlan;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Deploy New VM</h1>
        <p className="text-slate-400 mt-1">Configure your virtual machine and complete payment to provision.</p>
        {isReseller && <div className="mt-2 inline-flex items-center gap-2 bg-green-900/40 border border-green-700 text-green-400 text-sm px-3 py-1.5 rounded-lg">🎉 Reseller pricing: 25% off all components</div>}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Select plan */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">1. Select Plan</h2>
            <div className="grid grid-cols-3 gap-3">
              {plans.map(p => (
                <button key={p.id} type="button" onClick={() => {
                  setSelectedPlan(p);
                  setConfig(c => ({
                    ...c,
                    vcpu: Math.max(p.min_vcpu, Math.min(c.vcpu, p.max_vcpu)),
                    ram_gb: Math.max(p.min_ram_gb, Math.min(c.ram_gb, p.max_ram_gb)),
                    storage_gb: Math.max(p.min_storage_gb, Math.min(c.storage_gb, p.max_storage_gb)),
                  }));
                }}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${selectedPlan?.id === p.id ? 'border-blue-500 bg-blue-900/30' : 'border-slate-600 hover:border-slate-500'}`}>
                  <p className="text-white font-semibold">{p.name}</p>
                  <p className="text-slate-400 text-xs mt-1">{p.min_vcpu}–{p.max_vcpu} vCPU</p>
                  <p className="text-slate-400 text-xs">{p.min_ram_gb}–{p.max_ram_gb}GB RAM</p>
                </button>
              ))}
            </div>
          </div>

          {/* Configure resources */}
          {plan && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="text-white font-semibold mb-4">2. Configure Resources</h2>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-slate-300 text-sm font-medium flex items-center gap-2"><Cpu className="w-4 h-4 text-blue-400" />vCPU Cores</label>
                    <span className="text-blue-400 font-bold">{config.vcpu} vCPU</span>
                  </div>
                  <input type="range" min={plan.min_vcpu} max={plan.max_vcpu} value={config.vcpu}
                    onChange={e => setConfig({ ...config, vcpu: parseInt(e.target.value) })}
                    className="w-full accent-blue-500" />
                  <div className="flex justify-between text-xs text-slate-500 mt-1"><span>{plan.min_vcpu} vCPU</span><span>{plan.max_vcpu} vCPU</span></div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-slate-300 text-sm font-medium flex items-center gap-2"><Server className="w-4 h-4 text-purple-400" />RAM Memory</label>
                    <span className="text-purple-400 font-bold">{config.ram_gb} GB</span>
                  </div>
                  <input type="range" min={plan.min_ram_gb} max={plan.max_ram_gb} value={config.ram_gb}
                    onChange={e => setConfig({ ...config, ram_gb: parseInt(e.target.value) })}
                    className="w-full accent-purple-500" />
                  <div className="flex justify-between text-xs text-slate-500 mt-1"><span>{plan.min_ram_gb} GB</span><span>{plan.max_ram_gb} GB</span></div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-slate-300 text-sm font-medium flex items-center gap-2"><HardDrive className="w-4 h-4 text-green-400" />Storage (HDD)</label>
                    <span className="text-green-400 font-bold">{config.storage_gb >= 1000 ? (config.storage_gb/1000).toFixed(1)+'TB' : config.storage_gb+'GB'}</span>
                  </div>
                  <input type="range" min={plan.min_storage_gb} max={plan.max_storage_gb} step={10} value={config.storage_gb}
                    onChange={e => setConfig({ ...config, storage_gb: parseInt(e.target.value) })} step={plan.min_storage_gb >= 1000 ? 100 : 10}
                    className="w-full accent-green-500" />
                  <div className="flex justify-between text-xs text-slate-500 mt-1"><span>{plan.min_storage_gb >= 1000 ? (plan.min_storage_gb/1000)+'TB' : plan.min_storage_gb+'GB'}</span><span>{plan.max_storage_gb >= 1000 ? (plan.max_storage_gb/1000)+'TB' : plan.max_storage_gb+'GB'}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* OS Selection */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">3. Select Operating System</h2>
            <div className="space-y-2">
              {OS_OPTIONS.map(os => (
                <button key={os.value} type="button" onClick={() => setConfig({ ...config, os: os.value })}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${config.os === os.value ? 'border-blue-500 bg-blue-900/20' : 'border-slate-600 hover:border-slate-500'}`}>
                  <Monitor className="w-5 h-5 text-slate-400" />
                  <span className="text-white text-sm flex-1 text-left">{os.label}</span>
                  {os.free ? <span className="text-green-400 text-xs font-medium">Free</span> : <span className="text-yellow-400 text-xs font-medium">+₦30,000/mo</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Hostname */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">4. VM Hostname (Optional)</h2>
            <input type="text" value={config.hostname}
              onChange={e => setConfig({ ...config, hostname: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
              placeholder="e.g. my-web-server" />
          </div>
        </div>

        {/* Price summary */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 sticky top-6">
            <h2 className="text-white font-semibold mb-4">Order Summary</h2>
            {loading ? (
              <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
            ) : pricing ? (
              <div className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400"><span>{config.vcpu} vCPU × {isReseller ? '₦18,375' : '₦24,500'}</span><span>₦{(config.vcpu * (isReseller ? 18375 : 24500)).toLocaleString()}</span></div>
                  <div className="flex justify-between text-slate-400"><span>{config.ram_gb}GB RAM × {isReseller ? '₦1,969' : '₦2,625'}</span><span>₦{(config.ram_gb * (isReseller ? 1969 : 2625)).toLocaleString()}</span></div>
                  <div className="flex justify-between text-slate-400"><span>{config.storage_gb}GB HDD × {isReseller ? '₦81' : '₦108'}</span><span>₦{(config.storage_gb * (isReseller ? 81 : 108)).toLocaleString()}</span></div>
                  {config.os.startsWith('windows') && <div className="flex justify-between text-slate-400"><span>Windows OS</span><span>₦30,000</span></div>}
                  {isReseller && <div className="flex justify-between text-green-400 text-xs"><span>✓ Reseller pricing applied (25% off)</span></div>}
                  <div className="flex justify-between text-slate-400"><span>VAT (7.5%)</span><span>₦{pricing.vatNgn.toLocaleString()}</span></div>
                  <div className="flex justify-between text-slate-400"><span>Paystack Fee</span><span>₦{pricing.paystackFeeNgn.toLocaleString()}</span></div>
                </div>
                <div className="border-t border-slate-600 pt-3">
                  <div className="flex justify-between text-white font-bold text-lg">
                    <span>Total</span>
                    <span>₦{pricing.totalNgn.toLocaleString()}</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">Billed monthly</p>
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-3 rounded-lg mt-2 transition-colors">
                  {submitting ? 'Processing...' : 'Pay & Deploy →'}
                </button>
                <p className="text-slate-500 text-xs text-center">Secured by Paystack</p>
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-4">Configure your VM to see pricing</p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
