import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RationShops from './pages/RationShops';
import RationCards from './pages/RationCards';
import Tokens from './pages/Tokens';
import StockManagement from './pages/StockManagement';
import IVRCallLogs from './pages/IVRCallLogs';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';

import UserDashboard from './pages/UserDashboard';
import UserBooking from './pages/UserBooking';

const App = () => {
    return (
        <Routes>
            {/* Root → redirect to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Unified Login (Admin + Beneficiary) */}
            <Route path="/login" element={<Login />} />

            {/* Legacy routes → redirect to unified login */}
            <Route path="/user/login" element={<Navigate to="/login" replace />} />

            {/* ─── Beneficiary Routes ─── */}
            <Route path="/user/dashboard" element={<UserDashboard />} />
            <Route path="/user/book" element={<UserBooking />} />

            {/* ─── Admin Routes (Protected) ─── */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/admin/shops" element={<RationShops />} />
                <Route path="/admin/cards" element={<ProtectedRoute roles={['super_admin', 'district_admin', 'shop_operator']}><RationCards /></ProtectedRoute>} />
                <Route path="/admin/tokens" element={<Tokens />} />
                <Route path="/admin/stock" element={<ProtectedRoute roles={['super_admin', 'district_admin', 'shop_operator']}><StockManagement /></ProtectedRoute>} />
                <Route path="/admin/ivr-logs" element={<IVRCallLogs />} />
                <Route path="/admin/users" element={<ProtectedRoute roles={['super_admin', 'district_admin']}><Users /></ProtectedRoute>} />
                <Route path="/admin/audit" element={<ProtectedRoute roles={['super_admin', 'district_admin', 'auditor']}><AuditLogs /></ProtectedRoute>} />
            </Route>

            {/* Catch-all → login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};

export default App;
