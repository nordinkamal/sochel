import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

const Chat = () => {
    const { userId } = useParams();
    const { user, token } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [recipient, setRecipient] = useState(null);
    const [socket, setSocket] = useState(null);
    const messagesEndRef = useRef(null);

    // Initialize Socket
    useEffect(() => {
        if (!user) return;

        const newSocket = io('/'); // Auto-detects host
        setSocket(newSocket);

        newSocket.emit('join_chat', user._id);

        return () => newSocket.close();
    }, [user]);

    // Fetch Recipient Info & Message History
    useEffect(() => {
        if (!userId || !token) return;

        const fetchRecipientAndMessages = async () => {
            try {
                // Get Recipient Profile
                const resUser = await fetch(`/api/profile/user/${userId}`, {
                    headers: { 'x-auth-token': token }
                });
                const dataUser = await resUser.json();
                if (resUser.ok) setRecipient(dataUser.user);

                // Get Message History
                const resMsgs = await fetch(`/api/messages/${userId}`, {
                    headers: { 'x-auth-token': token }
                });
                const dataMsgs = await resMsgs.json();
                if (resMsgs.ok) setMessages(dataMsgs);

            } catch (err) {
                console.error(err);
            }
        };

        fetchRecipientAndMessages();
    }, [userId, token]);

    // Handle Incoming Messages
    useEffect(() => {
        if (!socket) return;

        socket.on('receive_message', (message) => {
            const senderId = message.sender._id || message.sender;
            const recipientId = message.recipient._id || message.recipient;
            const currentUserId = user._id;

            // Check if message belongs to this chat
            const isRelevant =
                (senderId === userId && recipientId === currentUserId) ||
                (senderId === currentUserId && recipientId === userId);

            if (isRelevant) {
                setMessages((prev) => [...prev, message]);
                scrollToBottom();
            }
        });

        return () => socket.off('receive_message');
    }, [socket, userId, user]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        const messageData = {
            sender: user._id,
            recipient: userId,
            text: newMessage
        };

        socket.emit('send_message', messageData);
        setNewMessage('');
        // Note: We wait for the 'receive_message' event (which is emitted back to sender too) 
        // to add the message to the list, creating an optimistic UI or confirming receipt.
        // The server is setup to emit back to sender.
    };

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm("Delete this message?")) return;
        try {
            const res = await fetch(`/api/messages/${messageId}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                setMessages(prev => prev.filter(m => m._id !== messageId));
            }
        } catch (err) {
            console.error("Error deleting message", err);
        }
    };

    if (!recipient) return <div className="flex-center" style={{ padding: '2rem' }}>Loading chat...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            {/* Chat Header */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link to={`/user/${recipient._id}`}>
                    <div style={{
                        width: '45px',
                        height: '45px',
                        borderRadius: '50%',
                        background: recipient.profilePicture ? `url(${recipient.profilePicture}) center/cover` : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'
                    }}>
                        {!recipient.profilePicture && recipient.username.charAt(0).toUpperCase()}
                    </div>
                </Link>
                <div>
                    <h3 style={{ margin: 0 }}>{recipient.username}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Chat</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="glass-panel" style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {messages.map((msg, index) => {
                    const msgSenderId = msg.sender._id || msg.sender;
                    const isOwn = msgSenderId === user._id;
                    return (
                        <div key={msg._id || index} style={{
                            alignSelf: isOwn ? 'flex-end' : 'flex-start',
                            maxWidth: '70%',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isOwn ? 'flex-end' : 'flex-start'
                        }}>
                            <div style={{
                                background: isOwn ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                padding: '0.8rem 1.2rem',
                                borderRadius: isOwn ? '18px 18px 0 18px' : '18px 18px 18px 0',
                                color: 'white',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                position: 'relative',
                                group: 'message'
                            }}>
                                {msg.text}

                                {isOwn && msg._id && (
                                    <button
                                        onClick={() => handleDeleteMessage(msg._id)}
                                        style={{
                                            position: 'absolute',
                                            top: '-10px',
                                            right: '-10px',
                                            background: 'rgba(255, 77, 77, 0.9)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '20px',
                                            height: '20px',
                                            fontSize: '10px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: 0,
                                            transition: 'opacity 0.2s',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                        }}
                                        className="delete-btn"
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <style>{`
                                div:hover > .delete-btn { opacity: 1 !important; }
                            `}</style>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} style={{ marginTop: '1rem', display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ minWidth: '80px' }}>Send</button>
            </form>
        </div>
    );
};

export default Chat;
