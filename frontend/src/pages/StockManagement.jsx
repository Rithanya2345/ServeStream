import { useState, useEffect } from 'react';
import { stockAPI, commodityAPI, shopAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const StockManagement = () => {
    const { user, isAuthorized } = useAuth();
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shopId, setShopId] = useState(user?.shop_id || '');
    const [shops, setShops] = useState([]);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [showModal, setShowModal] = useState(false);
    const [commodities, setCommodities] = useState([]);
    const [formData, setFormData] = useState({ commodity_id: '', allocated_qty: 0, distributed_qty: 0 });
    const [formError, setFormError] = useState('');

    const fetchStock = async () => {
        if (!shopId) return;
        setLoading(true);
        try {
            const res = await stockAPI.get(`shop_id=${shopId}&month=${month}&year=${year}`);
            setStock(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthorized('super_admin', 'district_admin')) {
            shopAPI.getAll('limit=100').then((res) => setShops(res.data || [])).catch(console.error);
        }
    }, []);

    useEffect(() => { fetchStock(); }, [shopId, month, year]);

    const openUpdate = async () => {
        setFormError('');
        setFormData({ commodity_id: '', allocated_qty: 0, distributed_qty: 0 });
        try {
            const res = await commodityAPI.getAll();
            setCommodities(res.data || []);
        } catch (err) {
            console.error(err);
        }
        setShowModal(true);
    };

    const handleUpsert = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            await stockAPI.upsert({
                shop_id: shopId,
                commodity_id: formData.commodity_id,
                month,
                year,
                allocated_qty: parseFloat(formData.allocated_qty),
                distributed_qty: parseFloat(formData.distributed_qty),
            });
            setShowModal(false);
            fetchStock();
        } catch (err) {
            setFormError(err.message);
        }
    };

    const stockBar = (allocated, remaining) => {
        const pct = allocated > 0 ? (remaining / allocated) * 100 : 0;
        const color = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
        return (
            <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                </div>
                <span className="text-xs text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="page-title">Stock Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Monthly commodity allocation and distribution</p>
                </div>
                {shopId && <button onClick={openUpdate} className="btn-primary">+ Update Stock</button>}
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                {isAuthorized('super_admin', 'district_admin') && (
                    <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="input-field w-auto">
                        <option value="">Select Shop</option>
                        {shops.map((s) => <option key={s.id} value={s.id}>{s.shop_code} — {s.name}</option>)}
                    </select>
                )}
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="input-field w-auto">
                    {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                </select>
                <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="input-field w-24" min={2020} />
            </div>

            {/* Stock Grid */}
            {!shopId ? (
                <div className="card p-12 text-center text-gray-500">Select a shop to view stock</div>
            ) : loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : stock.length === 0 ? (
                <div className="card p-12 text-center text-gray-500">No stock data for this period</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stock.map((s) => (
                        <div key={s.id} className="card-hover p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-white">{s.commodity_name}</h3>
                                    <p className="text-xs text-gray-500">{s.commodity_name_ta}</p>
                                </div>
                                <span className="text-xs text-gray-500 uppercase">{s.unit}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                <div>
                                    <p className="text-xs text-gray-500">Allocated</p>
                                    <p className="text-lg font-bold text-white">{s.allocated_qty}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Distributed</p>
                                    <p className="text-lg font-bold text-amber-400">{s.distributed_qty}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Remaining</p>
                                    <p className="text-lg font-bold text-emerald-400">{s.remaining_qty}</p>
                                </div>
                            </div>
                            {stockBar(s.allocated_qty, s.remaining_qty)}
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Update Stock">
                {formError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
                <form onSubmit={handleUpsert} className="space-y-4">
                    <div>
                        <label className="label">Commodity</label>
                        <select value={formData.commodity_id} onChange={(e) => setFormData({ ...formData, commodity_id: e.target.value })} className="input-field" required>
                            <option value="">Select Commodity</option>
                            {commodities.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.unit})</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Allocated Qty</label>
                            <input type="number" step="0.01" min="0" value={formData.allocated_qty} onChange={(e) => setFormData({ ...formData, allocated_qty: e.target.value })} className="input-field" required />
                        </div>
                        <div>
                            <label className="label">Distributed Qty</label>
                            <input type="number" step="0.01" min="0" value={formData.distributed_qty} onChange={(e) => setFormData({ ...formData, distributed_qty: e.target.value })} className="input-field" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">Update</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default StockManagement;
