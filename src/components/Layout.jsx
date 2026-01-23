import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, List, History, Users } from 'lucide-react';

export function Layout({ children, role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminMenuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/line-items', label: 'Line Items', icon: List },
    { path: '/admin/history', label: 'History', icon: History },
    { path: '/admin/vendors', label: 'Vendors', icon: Users },
  ];

  const vendorMenuItems = [
    { path: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/vendor/line-items', label: 'Line Items', icon: List },
    { path: '/vendor/history', label: 'History', icon: History },
  ];

  // Prefer explicit `role` prop, otherwise derive from authenticated user
  const resolvedRole = role || (user?.role === 'ADMIN' ? 'admin' : 'vendor');

  const menuItems = resolvedRole === 'admin' ? adminMenuItems : vendorMenuItems;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="w-full px-3 sm:px-4 lg:px-5">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <img src="https://ditos.technoboost.in/images/bag.svg" alt="VMS Logo" className="w-8 h-8" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Vendor Management System
                  </h1>
                  <p className="text-sm text-gray-500">
                    {user?.role === 'ADMIN' ? 'Admin Portal' : 'Vendor Portal'}
                  </p>
                </div>
              </div>

              <div className="hidden md:flex space-x-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  // Consider the item active when the current path equals or starts with the item path
                  const isActive =
                    location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full p-4 lg:p-5">
        {children}
      </main>
    </div>
  );
}
