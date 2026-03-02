/**
 * StatsCard
 * Animated stat card for the dashboard.
 */
const StatsCard = ({ title, value, subtitle, icon, color = 'primary', className = '' }) => {
    const colorMap = {
        primary: 'from-primary-600/20 to-primary-800/10 border-primary-500/15 text-primary-400',
        emerald: 'from-emerald-600/20 to-emerald-800/10 border-emerald-500/15 text-emerald-400',
        amber: 'from-amber-600/20 to-amber-800/10 border-amber-500/15 text-amber-400',
        rose: 'from-rose-600/20 to-rose-800/10 border-rose-500/15 text-rose-400',
        blue: 'from-blue-600/20 to-blue-800/10 border-blue-500/15 text-blue-400',
        violet: 'from-violet-600/20 to-violet-800/10 border-violet-500/15 text-violet-400',
    };

    const colors = colorMap[color] || colorMap.primary;

    return (
        <div className={`bg-gradient-to-br ${colors} border rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${className}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{title}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
                </div>
                {icon && (
                    <div className="text-3xl opacity-60">{icon}</div>
                )}
            </div>
        </div>
    );
};

export default StatsCard;
