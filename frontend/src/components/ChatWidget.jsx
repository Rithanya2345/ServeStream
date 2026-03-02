import { useState, useRef, useEffect } from 'react';

// API Base URL (hardcoded for widget simplicity or use env)
const API_URL = '/api/chatbot';

const ChatWidget = ({ initialCardNumber }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [chatState, setChatState] = useState('AWAITING_CARD'); // GREETING, AWAITING_CARD, CONFIRM_BOOKING, AWAITING_ACTION
    const [cardData, setCardData] = useState(null);
    const [loading, setLoading] = useState(false);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (initialCardNumber) {
            // If logged in, skip greeting and fetch details immediately
            setChatState('FETCHING_INITIAL');
            setLoading(true);
            fetch(`${API_URL}/card-details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ card_number: initialCardNumber })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setCardData(data.data);
                        const { shop_name_ta, district_name_ta, shop_name, district_name } = data.data;
                        setMessages([{
                            text: `வணக்கம்! (Welcome back!)\n\nகடை: ${shop_name_ta || shop_name}\nமாவட்டம்: ${district_name_ta || district_name}\n\nடோக்கன் பதிவு செய்ய வேண்டுமா? (Book Token?) [ஆம்/Yes]`,
                            sender: 'bot'
                        }]);
                        setChatState('CONFIRM_BOOKING');
                    } else {
                        setMessages([{ text: "வணக்கம்! உங்கள் விவரங்களை என்னால் பெற முடியவில்லை. (Hello! I couldn't fetch your details.)", sender: 'bot' }]);
                        setChatState('AWAITING_CARD');
                    }
                })
                .catch(() => {
                    setMessages([{ text: "தொழில்நுட்ப கோளாறு. (Technical Error.)", sender: 'bot' }]);
                    setChatState('AWAITING_CARD');
                })
                .finally(() => setLoading(false));
        } else {
            // Default Greeting
            setMessages([{ text: "வணக்கம்! நியாய விலை கடை சேவைக்கு வரவேற்கிறோம். (Welcome!)\n\nஉங்கள் ரேஷன் அட்டை எண்ணை உள்ளிடவும். (Enter Ration Card Number)", sender: "bot" }]);
            setChatState('AWAITING_CARD');
        }
    }, [initialCardNumber]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, loading]);

    const addBotMessage = (text) => {
        setMessages(prev => [...prev, { text, sender: "bot" }]);
    };

    const addUserMessage = (text) => {
        setMessages(prev => [...prev, { text, sender: "user" }]);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const input = inputText.trim();
        addUserMessage(input);
        setInputText("");
        setLoading(true);

        try {
            // State Machine Logic
            if (chatState === 'AWAITING_CARD') {
                // Expecting Card Number
                // Basic validation (length check?)
                if (input.length < 10) {
                    addBotMessage("தவறான ரேஷன் அட்டை எண். மீண்டும் முயற்சிக்கவும். (Invalid Card Number. Try again.)");
                    setLoading(false);
                    return;
                }

                // Call API to get details
                const res = await fetch(`${API_URL}/card-details`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ card_number: input })
                });
                const data = await res.json();

                if (data.success) {
                    setCardData(data.data);
                    const { shop_name_ta, district_name_ta, shop_name, district_name } = data.data;

                    addBotMessage(`கடை: ${shop_name_ta || shop_name}\nமாவட்டம்: ${district_name_ta || district_name}\n\nடோக்கன் பதிவு செய்ய வேண்டுமா? (Book Token?) [ஆம்/Yes]`);
                    setChatState('CONFIRM_BOOKING');
                } else {
                    addBotMessage("ரேஷன் அட்டை விவரங்கள் கிடைக்கவில்லை. (Card not found.)");
                }

            } else if (chatState === 'CONFIRM_BOOKING') {
                if (input.toLowerCase().match(/yes|ya|ok|ஆம்|சரி/)) {
                    // Book Token
                    const res = await fetch(`${API_URL}/book`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ card_number: cardData.card_number, shop_id: cardData.shop_id })
                    });
                    const data = await res.json();

                    if (data.success) {
                        addBotMessage(`✅ டோக்கன் பதிவு செய்யப்பட்டது!\nடோக்கன் எண்: ${data.data.token_number}\nவரிசை எண்: ${data.data.queue_number}`);
                        addBotMessage(`வேற ஏதேனும் உதவி தேவையா? (Need more help?) [Card Number / Status]`);
                        setChatState('AWAITING_CARD'); // Reset loop
                        setCardData(null);
                    } else { // Handle duplicate/error
                        addBotMessage(`❌ ${data.message || 'Error booking token.'}`);
                        setChatState('AWAITING_CARD');
                    }

                } else {
                    addBotMessage("சரி. நன்றி. (Ok. Thank you.)");
                    setChatState('AWAITING_CARD');
                    setCardData(null);
                }
            } else {
                // Fallback / Reset
                addBotMessage("உங்கள் ரேஷன் அட்டை எண்ணை உள்ளிடவும். (Enter Ration Card Number)");
                setChatState('AWAITING_CARD');
            }

        } catch (err) {
            console.error(err);
            addBotMessage("மன்னிக்கவும், தொழில்நுட்ப கோளாறு. (Sorry, Technical Error.)");
            setChatState('AWAITING_CARD');
        } finally {
            try {
                setLoading(false);
            } catch (e) {/* ignore unmount */ }
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 md:w-96 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col h-[500px]">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <span className="text-lg">🤖</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Ration Assistant</h3>
                                <p className="text-white/70 text-xs">Beneficiary Support</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/70 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/95 scrollbar-thin scrollbar-thumb-gray-700">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap ${msg.sender === 'user'
                                        ? 'bg-primary-600 text-white rounded-br-none'
                                        : 'bg-gray-800 text-gray-200 rounded-bl-none border border-white/5'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 border border-white/5">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 bg-gray-800 border-t border-white/10 flex gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type here..."
                            className="flex-1 bg-gray-900 text-white text-sm rounded-full px-4 py-2 border border-white/10 focus:outline-none focus:border-primary-500 transition-colors placeholder:text-gray-500"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            className="w-9 h-9 bg-primary-600 hover:bg-primary-500 text-white rounded-full flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!inputText.trim() || loading}
                        >
                            <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-full shadow-xl flex items-center justify-center text-white transition-all duration-300 hover:scale-105 hover:shadow-primary-500/25 ${isOpen ? 'rotate-90 opacity-0 pointer-events-none absolute' : 'opacity-100'}`}
            >
                <span className="text-2xl">💬</span>
            </button>
        </div>
    );
};

export default ChatWidget;
