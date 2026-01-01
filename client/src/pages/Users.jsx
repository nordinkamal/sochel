import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users', {
                    headers: { 'x-auth-token': token }
                });
                const data = await res.json();
                if (Array.isArray(data)) {
                    setUsers(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [token]);

    const handleFollow = async (userId, isFollowing) => {
        try {
            const method = isFollowing ? 'DELETE' : 'POST';
            const endpoint = isFollowing ? `/api/unfollow/${userId}` : `/api/follow/${userId}`;

            const res = await fetch(endpoint, {
                method,
                headers: { 'x-auth-token': token }
            });

            if (res.ok) {
                setUsers(users.map(user => {
                    if (user._id === userId) {
                        return {
                            ...user,
                            isFollowing: !isFollowing,
                            followersCount: isFollowing ? user.followersCount - 1 : (user.followersCount || 0) + 1
                        };
                    }
                    return user;
                }));
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="flex-center" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading users...</div>;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Discover People</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {users.map(user => (
                    <div key={user._id} className="glass-panel card fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: user.profilePicture ? `url(${user.profilePicture}) center/cover` : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: 'white',
                            marginBottom: '1rem',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                        }}>
                            {!user.profilePicture && (user.username ? user.username.charAt(0).toUpperCase() : '?')}
                        </div>
                        <Link to={`/user/${user._id}`} style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            {user.username}
                        </Link>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            {user.followersCount || 0} Followers
                        </div>
                        <button
                            className={`btn ${user.isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => handleFollow(user._id, user.isFollowing)}
                            style={{ width: '100%' }}
                        >
                            {user.isFollowing ? 'Unfollow' : 'Follow'}
                        </button>
                        <Link to={`/chat/${user._id}`} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
                            💬 Message
                        </Link>
                    </div>
                ))}
            </div>
            {users.length === 0 && (
                <div className="flex-center">No other users found.</div>
            )}
        </div>
    );
};

export default Users;
