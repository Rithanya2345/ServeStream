import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [mode, setMode] = useState('beneficiary'); // 'admin' or 'beneficiary'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleAdminSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/admin');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleBeneficiarySubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await fetch('/api/chatbot/card-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ card_number: cardNumber })
            });
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('userCard', JSON.stringify(data.data));
                navigate('/user/dashboard');
            } else {
                setError(data.message || 'Invalid Ration Card Number');
            }
        } catch (err) {
            setError('System error. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 -left-20 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/8 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/3 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-md px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-5 text-4xl shadow-xl shadow-emerald-500/20">
                        🌾
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        ServeStream
                    </h1>
                    <p className="text-emerald-400 text-sm mt-1 font-medium">தமிழ்நாடு பொது விநியோக முறை</p>
                    <p className="text-gray-500 text-xs mt-1">Tamil Nadu Public Distribution System</p>
                </div>

                {/* Mode Toggle */}
                <div className="flex bg-gray-800/50 rounded-xl p-1 mb-6 border border-white/5">
                    <button
                        onClick={() => { setMode('beneficiary'); setError(''); }}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'beneficiary'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <span>👤</span> Beneficiary
                    </button>
                    <button
                        onClick={() => { setMode('admin'); setError(''); }}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'admin'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <span>🔐</span> Administrator
                    </button>
                </div>

                {/* Login Card */}
                <div className="bg-gray-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

                    {error && (
                        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* ─── BENEFICIARY LOGIN ─── */}
                    {mode === 'beneficiary' && (
                        <form onSubmit={handleBeneficiarySubmit} className="space-y-5">
                            <div className="text-center mb-2">
                                <h2 className="text-lg font-semibold text-white">Beneficiary Login</h2>
                                <p className="text-gray-500 text-xs">பயனாளர் நுழைவு — Enter your Ration Card number</p>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2 ml-1">
                                    Ration Card Number / ரேஷன் அட்டை எண்
                                </label>
                                <input
                                    type="text"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value)}
                                    placeholder="330000000001"
                                    className="w-full bg-gray-900/80 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-lg tracking-wider font-mono"
                                    required
                                    minLength={12}
                                    maxLength={20}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        Access My Account
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* ─── ADMIN LOGIN ─── */}
                    {mode === 'admin' && (
                        <form onSubmit={handleAdminSubmit} className="space-y-5">
                            <div className="text-center mb-2">
                                <h2 className="text-lg font-semibold text-white">Administrator Login</h2>
                                <p className="text-gray-500 text-xs">நிர்வாகி நுழைவு — Staff & Operator access</p>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2 ml-1">Email address</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@ration.tn.gov.in"
                                    className="w-full bg-gray-900/80 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2 ml-1">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-gray-900/80 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/20 transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-gray-600 text-xs mt-6">
                    Government of Tamil Nadu — Civil Supplies Corporation
                </p>
            </div>
        </div>
    );
};

export default Login;
