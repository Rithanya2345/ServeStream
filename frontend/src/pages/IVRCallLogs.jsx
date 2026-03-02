import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { ivrAPI } from '../services/api';

const IVRCallLogs = () => {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');

    const fetchLogs = async (p = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: p, limit: 20 });
            if (actionFilter) params.set('action', actionFilter);
            const res = await ivrAPI.getCallLogs(params.toString());
            setLogs(res.data || []);
            setPagination(res.pagination || null);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchLogs(page); }, [page, actionFilter]);

    const actionBadge = (action) => {
        const map = { book_token: 'badge-success', check_status: 'badge-info', check_stock: 'badge-warning', cancel_token: 'badge-danger' };
        return <span className={map[action] || 'badge-neutral'}>{action?.replace(/_/g, ' ')}</span>;
    };

    const columns = [
        { key: 'created_at', label: 'Time', render: (v) => new Date(v).toLocaleString() },
        { key: 'shop_name', label: 'Shop', render: (v) => v || '—' },
        { key: 'caller_number', label: 'Caller', render: (v) => v ? <span className="font-mono">{v}</span> : '—' },
        { key: 'card_number', label: 'Card #', render: (v) => v ? <span className="font-mono text-primary-400">{v}</span> : '—' },
        { key: 'action', label: 'Action', render: (v) => actionBadge(v) },
        { key: 'is_successful', label: 'OK', render: (v) => v ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✗</span> },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="page-title">IVR Call Logs</h1>
                <p className="text-gray-500 text-sm mt-1">Monitor IVR interactions</p>
            </div>
            <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className="input-field w-auto">
                <option value="">All Actions</option>
                <option value="book_token">Book Token</option>
                <option value="check_status">Check Status</option>
                <option value="check_stock">Check Stock</option>
            </select>
            <DataTable columns={columns} data={logs} pagination={pagination} onPageChange={setPage} loading={loading} emptyMessage="No call logs found" />
        </div>
    );
};

export default IVRCallLogs;
