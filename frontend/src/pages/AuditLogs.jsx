import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { auditAPI } from '../services/api';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [entityFilter, setEntityFilter] = useState('');

    const fetchLogs = async (p = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: p, limit: 20 });
            if (entityFilter) params.set('entity_type', entityFilter);
            const res = await auditAPI.getLogs(params.toString());
            setLogs(res.data || []);
            setPagination(res.pagination || null);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchLogs(page); }, [page, entityFilter]);

    const columns = [
        { key: 'created_at', label: 'Time', render: (v) => new Date(v).toLocaleString() },
        { key: 'user_email', label: 'User', render: (v) => v || 'System' },
        { key: 'action', label: 'Action', render: (v) => <span className="badge-info">{v}</span> },
        { key: 'entity_type', label: 'Entity', render: (v) => <span className="font-mono text-xs">{v}</span> },
        { key: 'entity_id', label: 'Entity ID', render: (v) => <span className="font-mono text-xs text-gray-500">{v?.slice(0, 8)}...</span> },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="page-title">Audit Trail</h1>
                <p className="text-gray-500 text-sm mt-1">Immutable log of all system changes</p>
            </div>
            <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }} className="input-field w-auto">
                <option value="">All Entities</option>
                <option value="token">Tokens</option>
                <option value="ration_card">Ration Cards</option>
                <option value="ration_shop">Ration Shops</option>
                <option value="shop_stock">Shop Stock</option>
                <option value="user">Users</option>
            </select>
            <DataTable columns={columns} data={logs} pagination={pagination} onPageChange={setPage} loading={loading} emptyMessage="No audit logs found" />
        </div>
    );
};

export default AuditLogs;
