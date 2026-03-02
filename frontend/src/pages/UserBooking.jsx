import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatWidget from '../components/ChatWidget';

const UserBooking = () => {
    const navigate = useNavigate();
    const [cardData, setCardData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            const storedCard = localStorage.getItem('userCard');
            if (!storedCard) {
                navigate('/login');
                return;
            }
            const { card_number } = JSON.parse(storedCard);

            try {
                // Fetch fresh details to get family members
                const res = await fetch('/api/chatbot/card-details', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ card_number })
                });
                const data = await res.json();
                if (data.success) {
                    setCardData(data.data);
                } else {
                    alert('Error fetching details');
                    navigate('/user/dashboard');
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchDetails();
    }, [navigate]);

    const handleConfirmBooking = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/chatbot/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    card_number: cardData.card_number,
                    shop_id: cardData.shop_id
                })
            });
            const data = await res.json();
            if (data.success) {
                setBookingSuccess(data.data);
            } else {
                alert(data.message || 'Booking Failed');
            }
        } catch (err) {
            alert('Error booking token');
        } finally {
            setLoading(false);
        }
    };

    if (!cardData) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-6">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/user/dashboard')} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold">Book Ration Token</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Booking Card */}
                    <div className="bg-gray-800 border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden h-fit">

                        {!bookingSuccess ? (
                            <>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                                <div className="relative z-10 text-center space-y-6">
                                    <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto text-4xl">
                                        🎫
                                    </div>

                                    <div>
                                        <h2 className="text-xl font-bold text-white mb-2">Confirm Booking</h2>
                                        <p className="text-gray-400">
                                            Token for <span className="text-white font-medium">{cardData.shop_name}</span>.
                                        </p>
                                    </div>

                                    <div className="bg-gray-900/50 rounded-xl p-4 text-left space-y-2 border border-white/5">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Card Number</span>
                                            <span className="font-mono">{cardData.card_number}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Beneficiary</span>
                                            <span>{cardData.head_of_family}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Active Members</span>
                                            <span>{cardData.members ? cardData.members.length : 1}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleConfirmBooking}
                                        disabled={loading}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {loading ? 'Processing...' : 'Confirm Booking'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center space-y-6 animate-fade-in">
                                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-5xl shadow-xl shadow-emerald-500/30">
                                    ✅
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
                                    <p className="text-gray-400">Token generated successfully.</p>
                                </div>

                                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6">
                                    <p className="text-emerald-400 text-sm uppercase font-bold mb-1">Token Number</p>
                                    <p className="text-4xl font-mono font-bold text-white tracking-wider mb-3">{bookingSuccess.token_number}</p>
                                    <div className="flex justify-center gap-4 text-sm flex-wrap">
                                        <span className="bg-black/30 px-3 py-1 rounded-lg text-emerald-300">Queue: #{bookingSuccess.queue_number}</span>
                                        {bookingSuccess.estimated_time && (
                                            <span className="bg-black/30 px-3 py-1 rounded-lg text-amber-300">🕐 Visit at: {bookingSuccess.estimated_time}</span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/user/dashboard')}
                                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
                                >
                                    Return to Dashboard
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Family Details Card */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                            Family Members
                        </h3>
                        <div className="bg-gray-800 border border-white/5 rounded-2xl overflow-hidden">
                            {cardData.members && cardData.members.length > 0 ? (
                                <div className="divide-y divide-gray-700">
                                    {cardData.members.map((member, idx) => (
                                        <div key={idx} className="p-4 hover:bg-gray-700/50 transition-colors flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-lg">
                                                    {member.gender === 'female' ? '👩' : '👨'}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{member.name_ta || member.name}</p>
                                                    <p className="text-xs text-gray-400 capitalize">{member.relationship} • {member.age} yrs</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    No family members found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chatbot also available here */}
            <ChatWidget initialCardNumber={cardData.card_number} />
        </div>
    );
};

export default UserBooking;
