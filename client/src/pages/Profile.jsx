import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PostItem from '../components/PostItem';

const Profile = () => {
    const { id } = useParams();
    const { token, user: currentUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [stats, setStats] = useState({ followers: 0, following: 0 });
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const endpoint = id ? `/api/profile/user/${id}` : `/api/profile/me`;
                const res = await fetch(endpoint, {
                    headers: { 'x-auth-token': token }
                });
                const data = await res.json();

                if (res.ok) {
                    setProfile(data.user);
                    setPosts(Array.isArray(data.posts) ? data.posts : []);

                    if (id) {
                        setIsFollowing(data.isFollowing);
                        setStats({
                            followers: data.followersCount,
                            following: data.followingCount
                        });
                    } else {
                        // My profile
                        setStats({
                            followers: data.user.followers ? data.user.followers.length : 0,
                            following: data.user.following ? data.user.following.length : 0
                        });
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [id, token]);

    const handleFollow = async () => {
        if (!id) return;

        try {
            const method = isFollowing ? 'DELETE' : 'POST';
            const endpoint = isFollowing ? `/api/unfollow/${id}` : `/api/follow/${id}`;

            const res = await fetch(endpoint, {
                method,
                headers: { 'x-auth-token': token }
            });

            if (res.ok) {
                setIsFollowing(!isFollowing);
                setStats(prev => ({
                    ...prev,
                    followers: isFollowing ? prev.followers - 1 : prev.followers + 1
                }));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleImageClick = () => {
        if (isOwnProfile && fileInputRef.current && !uploading) {
            fileInputRef.current.click();
        }
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);

        try {
            const res = await fetch('/api/profile/upload', {
                method: 'POST',
                headers: {
                    'x-auth-token': token
                },
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                setProfile(prev => ({
                    ...prev,
                    profilePicture: data.profilePicture
                }));
            } else {
                alert(data.msg || 'Error uploading image');
            }
        } catch (err) {
            console.error(err);
            alert('Server error');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="flex-center" style={{ padding: '2rem' }}>Loading profile...</div>;
    if (!profile) return <div className="flex-center">User not found</div>;

    const isOwnProfile = !id || (currentUser && currentUser._id === profile._id);

    const handleDeleteAllPosts = async () => {
        if (!window.confirm("Are you sure you want to delete ALL your posts? This cannot be undone.")) return;
        try {
            const res = await fetch('/api/posts/me/all', {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                setPosts([]);
            } else {
                const data = await res.json();
                alert(data.msg || "Failed to delete posts");
            }
        } catch (err) {
            console.error("Error deleting all posts", err);
            alert("Server error");
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem' }}>
            <div className="glass-panel card fade-in" style={{ marginBottom: '2rem', textAlign: 'center' }}>

                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleImageChange}
                />

                <div
                    onClick={handleImageClick}
                    style={{
                        position: 'relative',
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: profile.profilePicture ? `url(${profile.profilePicture}) center/cover` : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        margin: '0 auto 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        color: 'white',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                        cursor: isOwnProfile ? 'pointer' : 'default',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => isOwnProfile && (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseOut={(e) => isOwnProfile && (e.currentTarget.style.transform = 'scale(1)')}
                >
                    {!profile.profilePicture && (profile.username ? profile.username.charAt(0).toUpperCase() : '?')}

                    {isOwnProfile && (
                        <div style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            background: 'var(--bg-card)',
                            borderRadius: '50%',
                            padding: '8px',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            📷
                        </div>
                    )}

                    {uploading && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem'
                        }}>
                            ...
                        </div>
                    )}
                </div>

                <h1 style={{ marginBottom: '0.5rem' }}>{profile.username}</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{profile.email}</p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginBottom: '2rem' }}>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.followers}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Followers</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.following}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Following</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{posts.length}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Posts</div>
                    </div>
                </div>

                {isOwnProfile ? (
                    posts.length > 0 && (
                        <button
                            onClick={handleDeleteAllPosts}
                            className="btn"
                            style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', border: '1px solid rgba(255, 77, 77, 0.3)', marginTop: '1rem' }}
                        >
                            🗑️ Delete All My Posts
                        </button>
                    )
                ) : (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                            className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={handleFollow}
                            style={{ minWidth: '150px' }}
                        >
                            {isFollowing ? 'Unfollow' : 'Follow'}
                        </button>
                        <Link to={`/chat/${id}`} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            💬 Message
                        </Link>
                    </div>
                )}
            </div>

            <h3 style={{ marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>Posts</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {posts.map(post => (
                    <PostItem
                        key={post._id}
                        post={post}
                        onDelete={(id) => setPosts(posts.filter(p => p._id !== id))}
                    />
                ))}
                {posts.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                        No posts yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
