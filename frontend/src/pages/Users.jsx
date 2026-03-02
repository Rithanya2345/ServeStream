import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { userAPI } from '../services/api';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    const fetchUsers = async (p = 1) => {
        setLoading(true);
        try {
            const res = await userAPI.getAll(`page=${p}&limit=20`);
            setUsers(res.data || []);
            setPagination(res.pagination || null);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(page); }, [page]);

    const toggleActive = async (userId, currentActive) => {
        try {
            await userAPI.update(userId, { is_active: !currentActive });
            fetchUsers(page);
        } catch (err) { console.error(err); }
    };

    const roleBadge = (role) => {
        const map = { super_admin: 'badge-danger', district_admin: 'badge-warning', shop_operator: 'badge-info', auditor: 'badge-neutral' };
        return <span className={map[role] || 'badge-neutral'}>{role?.replace(/_/g, ' ')}</span>;
    };

    const columns = [
        { key: 'full_name', label: 'Name' },
        { key: 'email', label: 'Email', render: (v) => <span className="text-gray-400 text-xs">{v}</span> },
        { key: 'role', label: 'Role', render: (v) => roleBadge(v) },
        { key: 'shop_name', label: 'Shop', render: (v) => v || '—' },
        {
            key: 'is_active', label: 'Status',
            render: (v, row) => (
                <button onClick={() => toggleActive(row.id, v)} className={v ? 'badge-success cursor-pointer' : 'badge-danger cursor-pointer'}>
                    {v ? 'Active' : 'Inactive'}
                </button>
            ),
        },
        { key: 'last_login', label: 'Last Login', render: (v) => v ? new Date(v).toLocaleDateString() : 'Never' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="page-title">User Management</h1>
                <p className="text-gray-500 text-sm mt-1">Manage system users and roles</p>
            </div>
            <DataTable columns={columns} data={users} pagination={pagination} onPageChange={setPage} loading={loading} emptyMessage="No users found" />
        </div>
    );
};

export default Users;
