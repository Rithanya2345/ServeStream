import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { cardAPI, shopAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const RationCards = () => {
    const { user } = useAuth();
    const [cards, setCards] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        shop_id: user?.shop_id || '', card_number: '', card_type: 'PHH',
        head_of_family: '', head_of_family_ta: '', mobile_number: '',
        address: '', total_members: 1,
    });
    const [formError, setFormError] = useState('');

    const fetchCards = async (p = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: p, limit: 20 });
            if (search) params.set('search', search);
            const res = await cardAPI.getAll(params.toString());
            setCards(res.data || []);
            setPagination(res.pagination || null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCards(page); }, [page]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchCards(1);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            await cardAPI.create({ ...formData, total_members: parseInt(formData.total_members) });
            setShowModal(false);
            fetchCards(page);
        } catch (err) {
            setFormError(err.message);
        }
    };

    const cardTypeBadge = (type) => {
        const map = {
            AAY: 'badge-danger',
            PHH: 'badge-warning',
            NPHH: 'badge-info',
            AY: 'badge-success',
        };
        return <span className={map[type] || 'badge-neutral'}>{type}</span>;
    };

    const columns = [
        { key: 'card_number', label: 'Card Number', render: (v) => <span className="font-mono text-primary-400">{v}</span> },
        { key: 'head_of_family', label: 'Head of Family' },
        { key: 'card_type', label: 'Type', render: (v) => cardTypeBadge(v) },
        { key: 'total_members', label: 'Members', render: (v) => <span className="font-semibold">{v}</span> },
        { key: 'shop_name', label: 'Shop' },
        { key: 'mobile_number', label: 'Mobile', render: (v) => v || <span className="text-gray-600">—</span> },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="page-title">Ration Cards</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage beneficiary ration cards</p>
                </div>
                <button onClick={() => { setFormError(''); setShowModal(true); }} className="btn-primary">+ Add Card</button>
            </div>

            <form onSubmit={handleSearch} className="flex gap-3">
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by card number or name..." className="input-field max-w-sm" />
                <button type="submit" className="btn-secondary">Search</button>
            </form>

            <DataTable columns={columns} data={cards} pagination={pagination} onPageChange={setPage} loading={loading} emptyMessage="No ration cards found" />

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Ration Card" size="lg">
                {formError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
                <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label">Card Number</label>
                        <input value={formData.card_number} onChange={(e) => setFormData({ ...formData, card_number: e.target.value })} className="input-field" required placeholder="e.g. TN-CHN-000001" />
                    </div>
                    <div>
                        <label className="label">Card Type</label>
                        <select value={formData.card_type} onChange={(e) => setFormData({ ...formData, card_type: e.target.value })} className="input-field">
                            <option value="AAY">AAY (Antyodaya)</option>
                            <option value="PHH">PHH (Priority)</option>
                            <option value="NPHH">NPHH (Non-Priority)</option>
                            <option value="AY">AY (Annapurna)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label">Head of Family (English)</label>
                        <input value={formData.head_of_family} onChange={(e) => setFormData({ ...formData, head_of_family: e.target.value })} className="input-field" required />
                    </div>
                    <div>
                        <label className="label">Head of Family (Tamil)</label>
                        <input value={formData.head_of_family_ta} onChange={(e) => setFormData({ ...formData, head_of_family_ta: e.target.value })} className="input-field" />
                    </div>
                    <div>
                        <label className="label">Mobile Number</label>
                        <input value={formData.mobile_number} onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })} className="input-field" placeholder="10-digit mobile" />
                    </div>
                    <div>
                        <label className="label">Total Members</label>
                        <input type="number" min={1} value={formData.total_members} onChange={(e) => setFormData({ ...formData, total_members: e.target.value })} className="input-field" required />
                    </div>
                    <div className="col-span-2">
                        <label className="label">Address</label>
                        <input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-field" />
                    </div>
                    <div className="col-span-2 flex justify-end gap-3 mt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">Create Card</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default RationCards;
