import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';
import { tokenAPI, shopAPI, cardAPI, ivrAPI } from '../services/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalShops: 0,
        totalCards: 0,
        todayTokens: 0,
        todayCalls: 0,
    });
    const [recentTokens, setRecentTokens] = useState([]);
    const [tokenStatusData, setTokenStatusData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];

                const [shopsRes, cardsRes, tokensRes, callsRes] = await Promise.allSettled([
                    shopAPI.getAll('limit=1'),
                    cardAPI.getAll('limit=1'),
                    tokenAPI.getAll(`booking_date=${today}&limit=100`), // Fetch more to calculate stats
                    ivrAPI.getCallLogs(`date=${today}&limit=1`),
                ]);

                setStats({
                    totalShops: shopsRes.status === 'fulfilled' ? shopsRes.value.pagination?.total || 0 : 0,
                    totalCards: cardsRes.status === 'fulfilled' ? cardsRes.value.pagination?.total || 0 : 0,
                    todayTokens: tokensRes.status === 'fulfilled' ? tokensRes.value.pagination?.total || 0 : 0,
                    todayCalls: callsRes.status === 'fulfilled' ? callsRes.value.pagination?.total || 0 : 0,
                });

                if (tokensRes.status === 'fulfilled') {
                    const tokens = tokensRes.value.data || [];
                    setRecentTokens(tokens.slice(0, 5));

                    // Calculate status distribution
                    const distribution = {
                        booked: 0,
                        confirmed: 0,
                        collected: 0,
                        cancelled: 0,
                        expired: 0
                    };
                    tokens.forEach(t => {
                        if (distribution[t.status] !== undefined) distribution[t.status]++;
                    });

                    setTokenStatusData({
                        labels: ['Booked', 'Confirmed', 'Collected', 'Cancelled', 'Expired'],
                        datasets: [
                            {
                                label: '# of Tokens',
                                data: [
                                    distribution.booked,
                                    distribution.confirmed,
                                    distribution.collected,
                                    distribution.cancelled,
                                    distribution.expired
                                ],
                                backgroundColor: [
                                    'rgba(59, 130, 246, 0.8)', // blue (booked)
                                    'rgba(245, 158, 11, 0.8)', // amber (confirmed)
                                    'rgba(16, 185, 129, 0.8)', // emerald (collected)
                                    'rgba(239, 68, 68, 0.8)',  // red (cancelled)
                                    'rgba(107, 114, 128, 0.8)', // gray (expired)
                                ],
                                borderColor: [
                                    'rgba(59, 130, 246, 1)',
                                    'rgba(245, 158, 11, 1)',
                                    'rgba(16, 185, 129, 1)',
                                    'rgba(239, 68, 68, 1)',
                                    'rgba(107, 114, 128, 1)',
                                ],
                                borderWidth: 1,
                            },
                        ],
                    });
                }
            } catch (err) {
                console.error('Dashboard fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, []);

    const statusBadge = (status) => {
        const map = {
            booked: 'badge-info',
            confirmed: 'badge-warning',
            collected: 'badge-success',
            cancelled: 'badge-danger',
            expired: 'badge-neutral',
        };
        return <span className={`px-2 py-1 rounded text-xs font-semibold ${map[status] || 'bg-gray-700 text-gray-300'}`}>{status}</span>;
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Dashboard</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Welcome back, <span className="text-gray-300">{user?.full_name}</span>
                    {user?.shop_name && <span> — {user.shop_name}</span>}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Ration Shops"
                    value={loading ? '—' : stats.totalShops}
                    icon="🏪"
                    color="primary"
                    className="animate-fade-in stagger-1"
                />
                <StatsCard
                    title="Ration Cards"
                    value={loading ? '—' : stats.totalCards}
                    icon="💳"
                    color="emerald"
                    className="animate-fade-in stagger-2"
                />
                <StatsCard
                    title="Today's Tokens"
                    value={loading ? '—' : stats.todayTokens}
                    icon="🎫"
                    color="amber"
                    className="animate-fade-in stagger-3"
                />
                <StatsCard
                    title="IVR Calls Today"
                    value={loading ? '—' : stats.todayCalls}
                    icon="📞"
                    color="violet"
                    className="animate-fade-in stagger-4"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Tokens Table */}
                <div className="lg:col-span-2 card p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl">
                    <h2 className="text-xl font-semibold text-white mb-4">Recent Tokens</h2>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : recentTokens.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">No tokens booked today</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Token #</th>
                                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Card</th>
                                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Queue</th>
                                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {recentTokens.map((t) => (
                                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3 text-sm font-mono text-primary-400">{t.token_number}</td>
                                            <td className="px-4 py-3 text-sm text-gray-300">{t.card_number}</td>
                                            <td className="px-4 py-3 text-sm text-white font-semibold">{t.queue_number}</td>
                                            <td className="px-4 py-3 text-sm">{statusBadge(t.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Chart Section */}
                <div className="card p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl flex flex-col items-center justify-center">
                    <h2 className="text-xl font-semibold text-white mb-6 w-full text-left">Token Status</h2>
                    {loading ? (
                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : tokenStatusData && stats.todayTokens > 0 ? (
                        <div className="w-64 h-64">
                            <Doughnut
                                data={tokenStatusData}
                                options={{
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                            labels: { color: '#9ca3af', boxWidth: 12 }
                                        }
                                    },
                                    cutout: '70%',
                                    borderColor: 'transparent'
                                }}
                            />
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-500">No data available for chart</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
