import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊', roles: null },
    { path: '/admin/shops', label: 'Ration Shops', icon: '🏪', roles: null },
    { path: '/admin/cards', label: 'Ration Cards', icon: '💳', roles: ['super_admin', 'district_admin', 'shop_operator'] },
    { path: '/admin/tokens', label: 'Tokens', icon: '🎫', roles: null },
    { path: '/admin/stock', label: 'Stock', icon: '📦', roles: ['super_admin', 'district_admin', 'shop_operator'] },
    { path: '/admin/ivr-logs', label: 'IVR Logs', icon: '📞', roles: null },
    { path: '/admin/users', label: 'Users', icon: '👥', roles: ['super_admin', 'district_admin'] },
    { path: '/admin/audit', label: 'Audit Trail', icon: '📋', roles: ['super_admin', 'district_admin', 'auditor'] },
];

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredItems = navItems.filter(
        (item) => !item.roles || item.roles.includes(user?.role)
    );

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-900/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-40">
            {/* Logo */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-lg font-bold shadow-lg shadow-primary-500/20">
                        R
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white leading-tight">Ration System</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Tamil Nadu PDS</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {filteredItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/admin'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                                ? 'bg-primary-600/15 text-primary-400 border border-primary-500/20 shadow-sm shadow-primary-500/10'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`
                        }
                    >
                        <span className="text-base group-hover:scale-110 transition-transform">{item.icon}</span>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t border-white/5">
                <div className="flex items-center gap-3 mb-3 px-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-md">
                        {user?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{user?.role?.replace('_', ' ')}</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="w-full btn-secondary text-xs py-2">
                    Sign Out
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
