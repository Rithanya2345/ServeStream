import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { shopAPI, districtAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const RationShops = () => {
    const { isAuthorized } = useAuth();
    const [shops, setShops] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        taluk_id: '', shop_code: '', name: '', name_ta: '',
        address: '', pincode: '', ivr_phone_number: '', operator_name: '', operator_phone: '',
    });
    const [districts, setDistricts] = useState([]);
    const [taluks, setTaluks] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [formError, setFormError] = useState('');

    const fetchShops = async (p = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: p, limit: 20 });
            if (search) params.set('search', search);
            const res = await shopAPI.getAll(params.toString());
            setShops(res.data || []);
            setPagination(res.pagination || null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchShops(page); }, [page]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchShops(1);
    };

    const openCreate = async () => {
        setFormData({ taluk_id: '', shop_code: '', name: '', name_ta: '', address: '', pincode: '', ivr_phone_number: '', operator_name: '', operator_phone: '' });
        setFormError('');
        setShowModal(true);
        try {
            const res = await districtAPI.getAll('limit=50');
            setDistricts(res.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDistrictChange = async (districtId) => {
        setSelectedDistrict(districtId);
        setFormData((f) => ({ ...f, taluk_id: '' }));
        if (districtId) {
            try {
                const res = await districtAPI.getTaluks(districtId);
                setTaluks(res.data || []);
            } catch (err) {
                console.error(err);
            }
        } else {
            setTaluks([]);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            await shopAPI.create(formData);
            setShowModal(false);
            fetchShops(page);
        } catch (err) {
            setFormError(err.message);
        }
    };

    const columns = [
        { key: 'shop_code', label: 'Code', render: (v) => <span className="font-mono text-primary-400">{v}</span> },
        { key: 'name', label: 'Shop Name' },
        { key: 'district_name', label: 'District' },
        { key: 'taluk_name', label: 'Taluk' },
        { key: 'ivr_phone_number', label: 'IVR Phone', render: (v) => <span className="font-mono">{v}</span> },
        {
            key: 'is_active', label: 'Status',
            render: (v) => v ? <span className="badge-success">Active</span> : <span className="badge-danger">Inactive</span>,
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="page-title">Ration Shops</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage fair price shops across Tamil Nadu</p>
                </div>
                {isAuthorized('super_admin', 'district_admin') && (
                    <button onClick={openCreate} className="btn-primary">+ Add Shop</button>
                )}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-3">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or code..."
                    className="input-field max-w-sm"
                />
                <button type="submit" className="btn-secondary">Search</button>
            </form>

            <DataTable
                columns={columns}
                data={shops}
                pagination={pagination}
                onPageChange={setPage}
                loading={loading}
                emptyMessage="No ration shops found"
            />

            {/* Create Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Ration Shop" size="lg">
                {formError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
                <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label">District</label>
                        <select value={selectedDistrict} onChange={(e) => handleDistrictChange(e.target.value)} className="input-field">
                            <option value="">Select District</option>
                            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Taluk</label>
                        <select value={formData.taluk_id} onChange={(e) => setFormData({ ...formData, taluk_id: e.target.value })} className="input-field" required>
                            <option value="">Select Taluk</option>
                            {taluks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Shop Code</label>
                        <input value={formData.shop_code} onChange={(e) => setFormData({ ...formData, shop_code: e.target.value })} className="input-field" required placeholder="e.g. FPS-CHN-001" />
                    </div>
                    <div>
                        <label className="label">IVR Phone Number</label>
                        <input value={formData.ivr_phone_number} onChange={(e) => setFormData({ ...formData, ivr_phone_number: e.target.value })} className="input-field" required placeholder="e.g. 044-12345678" />
                    </div>
                    <div className="col-span-2">
                        <label className="label">Shop Name (English)</label>
                        <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required />
                    </div>
                    <div className="col-span-2">
                        <label className="label">Shop Name (Tamil)</label>
                        <input value={formData.name_ta} onChange={(e) => setFormData({ ...formData, name_ta: e.target.value })} className="input-field" />
                    </div>
                    <div>
                        <label className="label">Operator Name</label>
                        <input value={formData.operator_name} onChange={(e) => setFormData({ ...formData, operator_name: e.target.value })} className="input-field" />
                    </div>
                    <div>
                        <label className="label">Operator Phone</label>
                        <input value={formData.operator_phone} onChange={(e) => setFormData({ ...formData, operator_phone: e.target.value })} className="input-field" />
                    </div>
                    <div className="col-span-2">
                        <label className="label">Address</label>
                        <input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-field" />
                    </div>
                    <div>
                        <label className="label">Pincode</label>
                        <input value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} className="input-field" maxLength={6} />
                    </div>
                    <div className="col-span-2 flex justify-end gap-3 mt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">Create Shop</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default RationShops;
