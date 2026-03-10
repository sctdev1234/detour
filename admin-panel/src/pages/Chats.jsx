import { MessageCircle, Search, User, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../lib/axios';

export default function Chats() {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedChat, setSelectedChat] = useState(null);
    const [searchParams] = useSearchParams();
    const activeMsgId = searchParams.get('msgId');
    const specificChatId = searchParams.get('chatId');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchChats();

        // Connect to Socket
        const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');

        socket.on('new_message', (data) => {
            const { chatId, message } = data;

            // Update chats list globally
            setChats(prevChats => {
                const chatIndex = prevChats.findIndex(c => c._id === chatId);
                if (chatIndex > -1) {
                    const newChats = [...prevChats];
                    const chatToUpdate = newChats[chatIndex];

                    // Don't add duplicate messages
                    if (!chatToUpdate.messages.find(m => m._id === message._id)) {
                        chatToUpdate.messages.push(message);
                    }

                    // Move the updated chat to the top of the list
                    newChats.splice(chatIndex, 1);
                    newChats.unshift(chatToUpdate);
                    return newChats;
                }
                return prevChats;
            });

            // Update selected chat if it's the one currently open
            setSelectedChat(prevSelected => {
                if (prevSelected && prevSelected._id === chatId) {
                    // Avoid duplicate insertion
                    if (!prevSelected.messages.find(m => m._id === message._id)) {
                        return {
                            ...prevSelected,
                            messages: [...prevSelected.messages, message]
                        };
                    }
                }
                return prevSelected;
            });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchChats = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/chats', {
                params: {
                    limit: 50 // Fetch recent 50 chats
                }
            });

            if (res.data.chats) {
                setChats(res.data.chats);

                // If we navigated here with a specific chatId, auto-select it
                if (specificChatId) {
                    const chatToSelect = res.data.chats.find(c => c._id === specificChatId);
                    if (chatToSelect) {
                        setSelectedChat(chatToSelect);

                        // Scroll to the message after a short delay to allow rendering
                        if (activeMsgId) {
                            setTimeout(() => {
                                const el = document.getElementById(`msg-${activeMsgId}`);
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }, 500);
                        }
                    }
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredChats = chats.filter(chat => {
        const searchLower = searchTerm.toLowerCase();
        return chat.participants.some(p =>
            (p.fullName && p.fullName.toLowerCase().includes(searchLower)) ||
            (p.email && p.email.toLowerCase().includes(searchLower))
        );
    });

    const getOtherParticipant = (participants, currentUserId) => {
        // Since we are admin, we don't have a currentUserId in the chat.
        // We can just show the first participant as the "main" one in the list,
        // or join their names.
        return participants.map(p => p.fullName || p.email).join(' & ');
    };

    const getParticipantRoles = (participants) => {
        return participants.map(p => p.role).join(' & ');
    };

    return (
        <div className="animate-fadeIn h-[calc(100vh-120px)] flex flex-col">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-white">Chat Logs</h1>
                    <p className="text-slate-400 mt-1">View communications between drivers and clients</p>
                </div>
            </div>

            <div className="flex gap-6 h-full overflow-hidden">
                {/* Left Panel: Chat List */}
                <div className="w-1/3 flex flex-col bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden shrink-0">
                    <div className="p-4 border-b border-slate-700/50 shrink-0 bg-slate-800/80">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/50 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {loading ? (
                            <div className="text-center py-8 text-slate-500 text-sm">Loading chats...</div>
                        ) : filteredChats.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">No chats found.</div>
                        ) : (
                            filteredChats.map(chat => (
                                <div
                                    key={chat._id}
                                    onClick={() => setSelectedChat(chat)}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedChat?._id === chat._id
                                        ? 'bg-blue-600/20 border border-blue-500/30'
                                        : 'bg-slate-800/40 border border-transparent hover:bg-slate-700/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                                            <MessageCircle className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-sm text-slate-200 truncate">
                                                {getOtherParticipant(chat.participants)}
                                            </h3>
                                            <div className="text-xs text-slate-500 truncate mt-0.5">
                                                {getParticipantRoles(chat.participants)}
                                            </div>
                                        </div>
                                    </div>
                                    {chat.messages.length > 0 && (
                                        <div className="text-xs text-slate-400 mt-2 truncate max-w-[200px]">
                                            {chat.messages[chat.messages.length - 1].text}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel: Chat Messages */}
                <div className="w-2/3 flex flex-col bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                    {selectedChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-slate-700/50 bg-slate-800/80 shrink-0 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-200">
                                            {getOtherParticipant(selectedChat.participants)}
                                        </h2>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <span>Chat ID: {selectedChat._id.substring(0, 8)}...</span>
                                            {selectedChat.requestId && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-blue-400">Request: {selectedChat.requestId.status}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 bg-slate-900/50 py-1 px-3 rounded-full border border-slate-700">
                                    {selectedChat.messages.length} messages
                                </div>
                            </div>

                            {/* Chat Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/50 [&::-webkit-scrollbar-thumb]:rounded-full">
                                {selectedChat.messages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-slate-500">
                                        No messages in this chat.
                                    </div>
                                ) : (
                                    selectedChat.messages.map((msg, idx) => {
                                        // We'll alternate sides based on the sender to simulate a chat view.
                                        // To do this reliably for admin view, we can just pick the first participant as "right" and others as "left", 
                                        // or just visually distinct styles based on role.
                                        const sender = msg.senderId;
                                        const isDriver = sender?.role === 'driver';

                                        const isReported = activeMsgId === (msg._id || idx).toString();

                                        return (
                                            <div
                                                id={`msg-${msg._id || idx}`}
                                                key={msg._id || idx}
                                                className={`flex ${isDriver ? 'justify-end' : 'justify-start'} ${isReported ? 'animate-pulse' : ''}`}
                                            >
                                                <div className={`flex items-start gap-2 max-w-[70%] ${isDriver ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                                        {sender?.photoURL ? (
                                                            <img src={sender.photoURL} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-4 h-4 text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div className={`p-3 rounded-2xl ${isDriver
                                                            ? 'bg-blue-600/20 border border-blue-500/20 text-blue-100 rounded-tr-none'
                                                            : 'bg-slate-700/50 border border-slate-600 text-slate-200 rounded-tl-none'
                                                        } ${isReported ? 'ring-2 ring-rose-500 bg-rose-500/10' : ''}`}>
                                                        <div className={`text-[10px] mb-1 font-medium ${isDriver ? 'text-blue-300 text-right' : 'text-slate-400'}`}>
                                                            {sender?.fullName || 'Unknown User'} ({sender?.role})
                                                        </div>
                                                        <div className="text-sm whitespace-pre-wrap">
                                                            {msg.text}
                                                        </div>
                                                        <div className={`text-[10px] mt-2 opacity-50 ${isDriver ? 'text-right' : 'text-left'}`}>
                                                            {new Date(msg.createdAt).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <MessageCircle className="w-16 h-16 text-slate-700 mb-4" />
                            <p className="text-lg font-medium text-slate-400">Select a chat to view messages</p>
                            <p className="text-sm text-slate-500 mt-2 max-w-sm text-center">
                                Click on any conversation from the list on the left to read the full communication log between participants.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
