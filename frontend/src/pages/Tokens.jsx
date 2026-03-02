import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { tokenAPI, cardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Tokens = () => {
    const { user } = useAuth();
    const [tokens, setTokens] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [showBookModal, setShowBookModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedToken, setSelectedToken] = useState(null);
    const [bookForm, setBookForm] = useState({ ration_card_id: '', shop_id: user?.shop_id || '', booked_via: 'admin' });
    const [statusForm, setStatusForm] = useState({ status: '', cancel_reason: '' });
    const [formError, setFormError] = useState('');
    const [cards, setCards] = useState([]);

    const fetchTokens = async (p = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: p, limit: 20 });
            if (statusFilter) params.set('status', statusFilter);
            if (dateFilter) params.set('booking_date', dateFilter);
            const res = await tokenAPI.getAll(params.toString());
            setTokens(res.data || []);
            setPagination(res.pagination || null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTokens(page); }, [page, statusFilter, dateFilter]);

    const openBook = async () => {
        setFormError('');
        setBookForm({ ration_card_id: '', shop_id: user?.shop_id || '', booked_via: 'admin' });
        setShowBookModal(true);
        try {
            const res = await cardAPI.getAll('limit=100');
            setCards(res.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleBook = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            await tokenAPI.book(bookForm);
            setShowBookModal(false);
            fetchTokens(page);
        } catch (err) {
            setFormError(err.message);
        }
    };

    const openStatusUpdate = (token) => {
        setSelectedToken(token);
        setStatusForm({ status: '', cancel_reason: '' });
        setFormError('');
        setShowStatusModal(true);
    };

    const handleStatusUpdate = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            await tokenAPI.updateStatus(selectedToken.id, statusForm);
            setShowStatusModal(false);
            fetchTokens(page);
        } catch (err) {
            setFormError(err.message);
        }
    };

    const statusBadge = (status) => {
        const map = { booked: 'badge-info', confirmed: 'badge-warning', collected: 'badge-success', cancelled: 'badge-danger', expired: 'badge-neutral' };
        return <span className={map[status] || 'badge-neutral'}>{status}</span>;
    };

    const columns = [
        { key: 'token_number', label: 'Token #', render: (v) => <span className="font-mono text-primary-400 text-xs">{v}</span> },
        { key: 'card_number', label: 'Card #', render: (v) => <span className="font-mono">{v}</span> },
        { key: 'head_of_family', label: 'Name' },
        { key: 'queue_number', label: 'Queue', render: (v) => <span className="text-white font-bold text-lg">{v}</span> },
        { key: 'status', label: 'Status', render: (v) => statusBadge(v) },
        { key: 'booking_date', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
        {
            key: 'actions', label: 'Actions',
            render: (_, row) => {
                if (['booked', 'confirmed'].includes(row.status)) {
                    return (
                        <button onClick={() => openStatusUpdate(row)} className="text-xs text-primary-400 hover:text-primary-300 font-medium">
                            Update
                        </button>
                    );
                }
                return null;
            },
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="page-title">Token Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Book and manage ration collection tokens</p>
                </div>
                <button onClick={openBook} className="btn-primary">+ Book Token</button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1); }} className="input-field w-auto" />
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto">
                    <option value="">All Status</option>
                    <option value="booked">Booked</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="collected">Collected</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                </select>
            </div>

            <DataTable columns={columns} data={tokens} pagination={pagination} onPageChange={setPage} loading={loading} emptyMessage="No tokens found" />

            {/* Book Token Modal */}
            <Modal isOpen={showBookModal} onClose={() => setShowBookModal(false)} title="Book Token">
                {formError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
                <form onSubmit={handleBook} className="space-y-4">
                    <div>
                        <label className="label">Ration Card</label>
                        <select value={bookForm.ration_card_id} onChange={(e) => setBookForm({ ...bookForm, ration_card_id: e.target.value })} className="input-field" required>
                            <option value="">Select Card</option>
                            {cards.map((c) => <option key={c.id} value={c.id}>{c.card_number} — {c.head_of_family}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Booking Channel</label>
                        <select value={bookForm.booked_via} onChange={(e) => setBookForm({ ...bookForm, booked_via: e.target.value })} className="input-field">
                            <option value="admin">Admin Panel</option>
                            <option value="walk_in">Walk-In</option>
                            <option value="mobile">Mobile</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 mt-2">
                        <button type="button" onClick={() => setShowBookModal(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">Book Token</button>
                    </div>
                </form>
            </Modal>

            {/* Update Status Modal */}
            <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title={`Update Token: ${selectedToken?.token_number}`}>
                {formError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
                <form onSubmit={handleStatusUpdate} className="space-y-4">
                    <div>
                        <label className="label">New Status</label>
                        <select value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })} className="input-field" required>
                            <option value="">Select Status</option>
                            {selectedToken?.status === 'booked' && <option value="confirmed">Confirmed</option>}
                            {selectedToken?.status === 'booked' && <option value="cancelled">Cancelled</option>}
                            {selectedToken?.status === 'confirmed' && <option value="collected">Collected</option>}
                            {selectedToken?.status === 'confirmed' && <option value="cancelled">Cancelled</option>}
                        </select>
                    </div>
                    {statusForm.status === 'cancelled' && (
                        <div>
                            <label className="label">Reason for Cancellation</label>
                            <input value={statusForm.cancel_reason} onChange={(e) => setStatusForm({ ...statusForm, cancel_reason: e.target.value })} className="input-field" required placeholder="Enter reason..." />
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setShowStatusModal(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" className={statusForm.status === 'cancelled' ? 'btn-danger' : 'btn-primary'}>
                            {statusForm.status === 'cancelled' ? 'Cancel Token' : 'Update Status'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Tokens;
