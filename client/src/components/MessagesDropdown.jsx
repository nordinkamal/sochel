import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MessagesDropdown = () => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(false);
    const { token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const fetchConversations = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const res = await fetch('/api/conversations', {
                    headers: { 'x-auth-token': token }
                });
                const data = await res.json();
                if (res.ok) {
                    setConversations(data);
                }
            } catch (err) {
                console.error("Error fetching conversations", err);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchConversations();
        }
    }, [isOpen, token]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="nav-item" ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="nav-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }}
                title="Messages"
            >
                💬
            </button>

            {isOpen && (
                <div className="glass-panel" style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    width: '300px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '1rem',
                    zIndex: 1000,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    border: '1px solid var(--glass-border)'
                }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Active Chats</h3>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>Loading...</div>
                    ) : conversations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>No recent conversations.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {conversations.map(conv => (
                                <Link
                                    key={conv._id}
                                    to={`/chat/${conv._id}`}
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '0.5rem',
                                        borderRadius: '8px',
                                        transition: 'background 0.2s',
                                        textDecoration: 'none',
                                        color: 'var(--text-primary)'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: conv.profilePicture ? `url(${conv.profilePicture}) center/cover` : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1rem', flexShrink: 0
                                    }}>
                                        {!conv.profilePicture && conv.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ fontWeight: 'bold' }}>{conv.username}</div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MessagesDropdown;
