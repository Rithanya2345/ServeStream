import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatWidget from '../components/ChatWidget';

const UserDashboard = () => {
    const navigate = useNavigate();
    const [cardData, setCardData] = useState(null);
    const [tokenStatus, setTokenStatus] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const storedCard = localStorage.getItem('userCard');
        if (!storedCard) {
            navigate('/login');
            return;
        }
        setCardData(JSON.parse(storedCard));
        fetchDashboardData(JSON.parse(storedCard).card_number);
    }, [navigate]);

    const fetchDashboardData = async (cardNumber) => {
        setLoading(true);
        try {
            const [cardRes, statusRes, historyRes] = await Promise.all([
                fetch('/api/chatbot/card-details', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ card_number: cardNumber })
                }),
                fetch('/api/chatbot/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ card_number: cardNumber })
                }),
                fetch('/api/chatbot/history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ card_number: cardNumber })
                })
            ]);

            const cardFreshData = await cardRes.json();
            const statusData = await statusRes.json();
            const historyData = await historyRes.json();

            if (cardFreshData.success) {
                setCardData(cardFreshData.data);
                localStorage.setItem('userCard', JSON.stringify(cardFreshData.data));
            }
            if (statusData.success && statusData.data) setTokenStatus(statusData.data);
            if (historyData.success) setHistory(historyData.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userCard');
        navigate('/login');
    };

    const getEstimatedTime = (queueNum) => {
        const q = queueNum || 1;
        const totalMin = 9 * 60 + (q - 1) * 10;
        return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!cardData) return null;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📋' },
        { id: 'family', label: 'Family Members', icon: '👨‍👩‍👧‍👦' },
        { id: 'entitlements', label: 'Entitlements', icon: '🏷️' },
        { id: 'history', label: 'Transaction History', icon: '📊' },
        { id: 'shop', label: 'Shop Info', icon: '🏪' },
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            {/* Navbar */}
            <nav className="bg-gray-800 border-b border-white/10 sticky top-0 z-10 px-4 py-3 shadow-lg">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-600/20">
                            🌾
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">ServeStream</h1>
                            <p className="text-xs text-emerald-400">தமிழ்நாடு பொது விநியோக முறை</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                        Sign Out
                    </button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto p-4 space-y-6">

                {/* Hero Card — Card Summary */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                            <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Welcome back,</p>
                            <h2 className="text-2xl font-bold text-white mb-1">{cardData.head_of_family_ta || cardData.head_of_family}</h2>
                            <p className="text-gray-400 text-sm mb-3">{cardData.head_of_family}</p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-gray-900 rounded-full text-xs font-mono text-emerald-400 border border-emerald-500/20">
                                    📇 {cardData.card_number}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${cardData.card_type === 'PHH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                    cardData.card_type === 'AAY' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}>
                                    {cardData.card_type} — {cardData.card_type_info?.label_ta || cardData.card_type_info?.label || ''}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${cardData.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                    {cardData.is_active ? '✅ Active' : '❌ Inactive'}
                                </span>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-gray-900/60 rounded-xl p-3 border border-white/5 min-w-[90px]">
                                <p className="text-2xl font-bold text-emerald-400">{cardData.total_members || cardData.members?.length || 1}</p>
                                <p className="text-[10px] text-gray-500 uppercase">Members</p>
                            </div>
                            <div className="bg-gray-900/60 rounded-xl p-3 border border-white/5 min-w-[90px]">
                                <p className="text-2xl font-bold text-blue-400">{history.length}</p>
                                <p className="text-[10px] text-gray-500 uppercase">Transactions</p>
                            </div>
                            <div className="bg-gray-900/60 rounded-xl p-3 border border-white/5 min-w-[90px]">
                                <p className="text-2xl font-bold text-amber-400">{tokenStatus ? '1' : '0'}</p>
                                <p className="text-[10px] text-gray-500 uppercase">Active Token</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact & Address Row */}
                    <div className="relative z-10 mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
                        {cardData.mobile_number && (
                            <span className="flex items-center gap-1">📱 {cardData.mobile_number}</span>
                        )}
                        {cardData.address && (
                            <span className="flex items-center gap-1">📍 {cardData.address}</span>
                        )}
                        <span className="flex items-center gap-1">🏪 {cardData.shop_name_ta || cardData.shop_name} ({cardData.shop_code})</span>
                        <span className="flex items-center gap-1">📍 {cardData.district_name} / {cardData.taluk_name}</span>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 bg-gray-800 rounded-xl p-1 border border-white/5 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">

                    {/* ─── OVERVIEW TAB ─── */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Token Status */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="w-1 h-5 bg-emerald-500 rounded-full"></span>
                                    Token Status
                                </h3>
                                {tokenStatus ? (
                                    <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden">
                                        <div className="absolute -right-8 -bottom-8 opacity-10 text-[8rem]">🎫</div>
                                        <div className="relative">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-emerald-400 font-medium text-sm mb-1">Active Token</p>
                                                    <p className="text-2xl font-bold text-white font-mono">{tokenStatus.token_number}</p>
                                                </div>
                                                <div className="bg-emerald-500 text-gray-900 font-bold px-3 py-1.5 rounded-xl text-center">
                                                    <p className="text-[10px] uppercase opacity-70">Queue</p>
                                                    <p className="text-xl">{tokenStatus.queue_number}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 text-sm">
                                                <div className="bg-gray-900/50 rounded-xl p-3">
                                                    <p className="text-gray-500 text-xs">Status</p>
                                                    <p className="font-medium capitalize text-white">{tokenStatus.status}</p>
                                                </div>
                                                <div className="bg-gray-900/50 rounded-xl p-3">
                                                    <p className="text-gray-500 text-xs">Date</p>
                                                    <p className="font-medium text-white text-xs">{new Date(tokenStatus.collection_date).toDateString()}</p>
                                                </div>
                                                <div className="bg-amber-900/30 rounded-xl p-3 border border-amber-500/20">
                                                    <p className="text-amber-400 text-xs">🕐 Visit At</p>
                                                    <p className="font-bold text-amber-300 text-lg">{getEstimatedTime(tokenStatus.queue_number)}</p>
                                                </div>
                                            </div>
                                            <p className="text-center text-xs text-emerald-400/80 mt-3 animate-pulse">
                                                Please visit your shop at the scheduled time.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-800 border border-white/5 rounded-2xl p-8 text-center">
                                        <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl opacity-50">🎫</div>
                                        <h3 className="text-lg font-medium text-white mb-2">No Active Token</h3>
                                        <p className="text-gray-400 text-sm mb-4">Book a token to collect your rations.</p>
                                        <button
                                            onClick={() => navigate('/user/book')}
                                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                                        >
                                            Book Token Now
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Card Details */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                                    Card Details / அட்டை விவரங்கள்
                                </h3>
                                <div className="bg-gray-800 border border-white/5 rounded-2xl p-5 space-y-3">
                                    {[
                                        { label: 'Card Number / அட்டை எண்', value: cardData.card_number },
                                        { label: 'Head of Family / குடும்பத் தலைவர்', value: `${cardData.head_of_family_ta || ''} / ${cardData.head_of_family}` },
                                        { label: 'Card Type / அட்டை வகை', value: `${cardData.card_type} — ${cardData.card_type_info?.label_ta || cardData.card_type_info?.label || ''}` },
                                        { label: 'Total Members / மொத்த உறுப்பினர்கள்', value: cardData.total_members || cardData.members?.length || 1 },
                                        { label: 'Mobile / கைபேசி எண்', value: cardData.mobile_number || 'Not linked' },
                                        { label: 'Address / முகவரி', value: cardData.address || 'Not available' },
                                        { label: 'Status / நிலை', value: cardData.is_active ? '✅ Active / செயலில்' : '❌ Inactive / செயலற்றது' },
                                        { label: 'Ration Shop / நியாய விலைக் கடை', value: `${cardData.shop_name_ta || cardData.shop_name} (${cardData.shop_code})` },
                                        { label: 'District / மாவட்டம்', value: `${cardData.district_name_ta || ''} / ${cardData.district_name}` },
                                        { label: 'Taluk / வட்டம்', value: `${cardData.taluk_name_ta || ''} / ${cardData.taluk_name}` },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                                            <span className="text-gray-500 text-xs flex-shrink-0">{item.label}</span>
                                            <span className="text-white text-xs text-right font-medium">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── FAMILY MEMBERS TAB ─── */}
                    {activeTab === 'family' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="w-1 h-5 bg-pink-500 rounded-full"></span>
                                    Family Members / குடும்ப உறுப்பினர்கள்
                                </h3>
                                <span className="text-sm text-gray-500">Total: {cardData.members?.length || 0}</span>
                            </div>
                            <div className="bg-gray-800 border border-white/5 rounded-2xl overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-2 p-3 bg-gray-900/50 text-xs text-gray-500 uppercase font-bold border-b border-white/5">
                                    <span className="col-span-1">#</span>
                                    <span className="col-span-4">Name / பெயர்</span>
                                    <span className="col-span-2">Age / வயது</span>
                                    <span className="col-span-2">Relation</span>
                                    <span className="col-span-2">Aadhaar</span>
                                    <span className="col-span-1">Status</span>
                                </div>
                                {cardData.members && cardData.members.length > 0 ? (
                                    <div className="divide-y divide-gray-700/50">
                                        {cardData.members.map((member, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-2 p-3 hover:bg-gray-700/30 transition-colors items-center">
                                                <span className="col-span-1 text-gray-600 text-sm">{idx + 1}</span>
                                                <div className="col-span-4 flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                                                        {member.gender === 'female' ? '👩' : '👨'}
                                                    </div>
                                                    <div>
                                                        <p className="text-white text-sm font-medium leading-tight">{member.name_ta || member.name}</p>
                                                        {member.name_ta && <p className="text-gray-500 text-[10px]">{member.name}</p>}
                                                    </div>
                                                </div>
                                                <span className="col-span-2 text-gray-300 text-sm">{member.age} / {member.gender === 'male' ? 'ஆண்' : member.gender === 'female' ? 'பெண்' : 'Other'}</span>
                                                <span className="col-span-2 text-gray-300 text-sm capitalize">{member.relationship}</span>
                                                <span className="col-span-2">
                                                    {member.aadhaar_last4 ? (
                                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs font-mono">
                                                            XXXX-{member.aadhaar_last4}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs">Not Linked</span>
                                                    )}
                                                </span>
                                                <span className="col-span-1">
                                                    {member.is_active !== false ? (
                                                        <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>
                                                    ) : (
                                                        <span className="w-2 h-2 bg-red-500 rounded-full inline-block"></span>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-gray-500 text-sm">No family members found.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ─── ENTITLEMENTS TAB ─── */}
                    {activeTab === 'entitlements' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                                Monthly Entitlements / மாதாந்திர பொருட்கள் விவரம்
                            </h3>
                            <p className="text-gray-500 text-sm">
                                Current month: {new Date().toLocaleString('ta-IN', { month: 'long', year: 'numeric' })} • Card Type: <span className="text-white font-bold">{cardData.card_type}</span>
                            </p>

                            {/* Entitlement info based on card type */}
                            <div className={`rounded-xl p-4 border ${cardData.card_type === 'PHH' ? 'bg-rose-900/20 border-rose-500/20' :
                                cardData.card_type === 'AAY' ? 'bg-orange-900/20 border-orange-500/20' :
                                    'bg-blue-900/20 border-blue-500/20'
                                }`}>
                                <p className="text-sm font-bold text-white mb-2">
                                    {cardData.card_type_info?.label} / {cardData.card_type_info?.label_ta}
                                </p>
                                <div className="text-xs text-gray-300 space-y-1">
                                    {cardData.card_type === 'PHH' && (
                                        <>
                                            <p>• Rice: 5 kg/person/month (Free) / அரிசி: ஒரு நபருக்கு 5 கிலோ (இலவசம்)</p>
                                            <p>• Sugar: 500g/card/month (₹13.50/kg) / சர்க்கரை: 500 கிராம் (₹13.50/கிலோ)</p>
                                            <p>• Wheat: 1 kg/card/month (₹2/kg) / கோதுமை: 1 கிலோ (₹2/கிலோ)</p>
                                            <p>• Kerosene & Palm Oil at subsidized rates</p>
                                        </>
                                    )}
                                    {cardData.card_type === 'AAY' && (
                                        <>
                                            <p>• Rice: 35 kg/card/month (Free) / அரிசி: 35 கிலோ (இலவசம்)</p>
                                            <p>• Sugar: 1 kg/card/month (₹13.50/kg) / சர்க்கரை: 1 கிலோ</p>
                                            <p>• Wheat: 1 kg/card/month (₹2/kg) / கோதுமை: 1 கிலோ</p>
                                            <p>• Highest priority entitlements</p>
                                        </>
                                    )}
                                    {(cardData.card_type === 'NPHH' || cardData.card_type === 'NPS') && (
                                        <>
                                            <p>• Rice: 5 kg/person/month (₹1/kg) / அரிசி: ஒரு நபருக்கு 5 கிலோ</p>
                                            <p>• Limited sugar and wheat at subsidized rates</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Shop Stock (current month) */}
                            <h4 className="text-sm font-bold text-gray-400 pt-2">Shop Stock — {cardData.shop_name}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {cardData.entitlements && cardData.entitlements.length > 0 ? (
                                    cardData.entitlements.map((item, idx) => (
                                        <div key={idx} className="bg-gray-800 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-lg">📦</div>
                                                <div>
                                                    <p className="text-sm font-medium text-white">{item.name_ta || item.name}</p>
                                                    <p className="text-[10px] text-gray-500">{item.name} ({item.unit})</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-emerald-400">{parseFloat(item.remaining_qty).toFixed(0)}</p>
                                                <p className="text-[10px] text-gray-500">{parseFloat(item.distributed_qty).toFixed(0)} / {parseFloat(item.allocated_qty).toFixed(0)} {item.unit}</p>
                                                {/* Progress bar */}
                                                <div className="w-20 h-1.5 bg-gray-700 rounded-full mt-1">
                                                    <div
                                                        className="h-1.5 bg-emerald-500 rounded-full"
                                                        style={{ width: `${Math.min(100, (parseFloat(item.distributed_qty) / parseFloat(item.allocated_qty)) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 bg-gray-800 border border-white/5 rounded-xl p-8 text-center text-gray-500 text-sm">
                                        No stock data available for this month.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ─── TRANSACTION HISTORY TAB ─── */}
                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                                Transaction History / பரிவர்த்தனை வரலாறு
                            </h3>
                            <div className="bg-gray-800 border border-white/5 rounded-2xl overflow-hidden">
                                {/* Header */}
                                <div className="grid grid-cols-12 gap-2 p-3 bg-gray-900/50 text-xs text-gray-500 uppercase font-bold border-b border-white/5">
                                    <span className="col-span-4">Token Number</span>
                                    <span className="col-span-3">Booking Date</span>
                                    <span className="col-span-2">Booked Via</span>
                                    <span className="col-span-3 text-right">Status</span>
                                </div>
                                {history.length > 0 ? (
                                    <div className="divide-y divide-gray-700/50">
                                        {history.map((record) => (
                                            <div key={record.id} className="grid grid-cols-12 gap-2 p-3 hover:bg-gray-700/30 transition-colors items-center">
                                                <div className="col-span-4">
                                                    <p className="text-white font-medium text-sm font-mono">{record.token_number}</p>
                                                    <p className="text-[10px] text-gray-500">Queue #{record.queue_number}</p>
                                                </div>
                                                <div className="col-span-3 text-gray-300 text-sm">
                                                    {new Date(record.booking_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300 capitalize">{record.booked_via || 'chatbot'}</span>
                                                </div>
                                                <div className="col-span-3 text-right">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${record.status === 'collected' ? 'bg-emerald-500/10 text-emerald-400' :
                                                        record.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                                            record.status === 'expired' ? 'bg-yellow-500/10 text-yellow-400' :
                                                                'bg-blue-500/10 text-blue-400'
                                                        }`}>
                                                        {record.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-gray-500 text-sm">No transaction history found.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ─── SHOP INFO TAB ─── */}
                    {activeTab === 'shop' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="w-1 h-5 bg-teal-500 rounded-full"></span>
                                Shop Details / கடை விவரங்கள்
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-800 border border-white/5 rounded-2xl p-5 space-y-3">
                                    {[
                                        { label: 'Shop Name / கடை பெயர்', value: `${cardData.shop_name_ta || ''} / ${cardData.shop_name}` },
                                        { label: 'Shop Code / கடை குறியீடு', value: cardData.shop_code },
                                        { label: 'Address / முகவரி', value: cardData.shop_address || 'Not available' },
                                        { label: 'Pincode / அஞ்சல் குறியீடு', value: cardData.shop_pincode || '-' },
                                        { label: 'Operating Hours / நேரம்', value: cardData.operating_hours || '09:00-17:00' },
                                        { label: 'Operator / உரிமையாளர்', value: cardData.operator_name || '-' },
                                        { label: 'Operator Phone / தொலைபேசி', value: cardData.operator_phone || '-' },
                                        { label: 'District / மாவட்டம்', value: `${cardData.district_name_ta || ''} / ${cardData.district_name}` },
                                        { label: 'Taluk / வட்டம்', value: `${cardData.taluk_name_ta || ''} / ${cardData.taluk_name}` },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                                            <span className="text-gray-500 text-xs">{item.label}</span>
                                            <span className="text-white text-xs text-right font-medium">{item.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Announcements */}
                                <div className="space-y-4">
                                    <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl">
                                        <h4 className="text-blue-400 text-sm font-bold mb-2">📢 Announcements / அறிவிப்புகள்</h4>
                                        <div className="space-y-2 text-gray-400 text-xs leading-relaxed">
                                            <p>• Distribution hours: {cardData.operating_hours || '09:00 AM - 05:00 PM'}</p>
                                            <p>• Token booking available via Chat, IVR, and Online portal.</p>
                                            <p>• Aadhaar authentication is mandatory for ration collection.</p>
                                            <p>• For complaints, contact your shop operator or call the helpline.</p>
                                        </div>
                                    </div>

                                    <div className="bg-amber-900/20 border border-amber-500/20 p-4 rounded-xl">
                                        <h4 className="text-amber-400 text-sm font-bold mb-2">⚠️ Important / முக்கியம்</h4>
                                        <div className="space-y-1 text-gray-400 text-xs leading-relaxed">
                                            <p>• Carry your Aadhaar card or smart ration card when visiting.</p>
                                            <p>• Uncollected tokens expire at end of day.</p>
                                            <p>• SMS notifications sent to registered mobile number.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <ChatWidget initialCardNumber={cardData.card_number} />
        </div>
    );
};

export default UserDashboard;
