import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Server, Plus, User, Shield, HelpCircle,
  Users, DollarSign, LogOut, Menu, Wallet
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'finance_admin';
  const isReseller = user?.role === 'reseller';

  const clientNav = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/new-order', icon: Plus, label: 'New VM Order' },
    { to: '/dashboard/orders', icon: Server, label: 'My VMs' },
    { to: '/dashboard/support', icon: HelpCircle, label: 'Support' },
    { to: '/dashboard/profile', icon: User, label: 'Profile' },
    { to: '/dashboard/security', icon: Shield, label: 'Security' },
  ];

  const resellerNav = [
    { to: '/reseller', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/new-order', icon: Plus, label: 'New VM Order' },
    { to: '/dashboard/orders', icon: Server, label: 'My VMs' },
    { to: '/reseller/clients', icon: Users, label: 'My Clients' },
    { to: '/reseller/earnings', icon: DollarSign, label: 'Earnings' },
    { to: '/reseller/withdraw', icon: Wallet, label: 'Withdraw' },
    { to: '/dashboard/support', icon: HelpCircle, label: 'Support' },
    { to: '/dashboard/security', icon: Shield, label: 'Security' },
  ];

  const adminNav = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/orders', icon: Server, label: 'All Orders' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/withdrawals', icon: Wallet, label: 'Withdrawals' },
    { to: '/dashboard/security', icon: Shield, label: 'Security' },
  ];

  const navItems = isAdmin ? adminNav : isReseller ? resellerNav : clientNav;
  const handleLogout = () => { logout(); navigate('/login'); };

  const NavLink = ({ to, icon: Icon, label }) => {
    const active = location.pathname === to;
    return (
      <Link to={to} onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
        <Icon className="w-5 h-5" />
        {label}
      </Link>
    );
  };

  const roleBadge = { super_admin: 'Super Admin', finance_admin: 'Finance Admin', reseller: 'Reseller', client: 'Client' };
  const roleBadgeColor = { super_admin: 'bg-purple-600', finance_admin: 'bg-yellow-600', reseller: 'bg-green-600', client: 'bg-red-700' };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-4 py-4 border-b border-slate-700">
            <img src="/pluto-logo.svg" alt="Pluto Cloud" className="h-14 mx-auto" />
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="h-px flex-1 bg-red-600 opacity-50"></div>
              <span className="text-xs text-slate-500 tracking-widest uppercase">Portal</span>
              <div className="h-px flex-1 bg-red-600 opacity-50"></div>
            </div>
          </div>

          {/* User info */}
          <div className="px-4 py-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full text-white ${roleBadgeColor[user?.role]}`}>
                  {roleBadge[user?.role]}
                </span>
              </div>
            </div>
          </div>

          {/* Red accent bar */}
          <div className="h-0.5 bg-gradient-to-r from-red-600 via-red-500 to-transparent mx-4 mt-1"></div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map(item => <NavLink key={item.to} {...item} />)}
          </nav>

          {/* Logout */}
          <div className="px-3 py-4 border-t border-slate-700">
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-700 w-full transition-colors">
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <p className="text-slate-400 text-sm">portal.plutocloudcomputing.ng</p>
          </div>
          {/* Red accent on header */}
          <div className="w-2 h-2 rounded-full bg-red-600"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-red-800"></div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
