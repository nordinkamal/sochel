import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import PostItem from '../components/PostItem';

const Feed = () => {
    const [posts, setPosts] = useState([]);
    const [newPost, setNewPost] = useState('');
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);
    const [posting, setPosting] = useState(false);

    const fetchPosts = async () => {
        try {
            const res = await fetch('/api/posts', {
                headers: { 'x-auth-token': token }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setPosts(data);
            }
        } catch (err) {
            console.error("Error fetching posts", err);
        } finally {
            setLoading(false);
        }
    };

    useState(() => {
        fetchPosts();
    }, [token]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const clearImage = () => {
        setImage(null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newPost.trim() && !image) return;

        setPosting(true);
        const formData = new FormData();
        formData.append('content', newPost);
        if (image) {
            formData.append('image', image);
        }

        try {
            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'x-auth-token': token
                },
                body: formData
            });

            if (res.ok) {
                setNewPost('');
                clearImage();
                fetchPosts();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setPosting(false);
        }
    };

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', paddingBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Your Feed</h2>

            <div className="glass-panel card" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <textarea
                            className="form-input"
                            rows="3"
                            placeholder="What's on your mind?"
                            value={newPost}
                            onChange={(e) => setNewPost(e.target.value)}
                            style={{ resize: 'vertical', minHeight: '100px', fontFamily: 'inherit' }}
                        ></textarea>
                    </div>

                    {preview && (
                        <div style={{ position: 'relative', marginBottom: '1rem', width: 'fit-content' }}>
                            <img src={preview} alt="Preview" style={{ maxHeight: '200px', borderRadius: '8px' }} />
                            <button
                                type="button"
                                onClick={clearImage}
                                style={{
                                    position: 'absolute',
                                    top: '-10px',
                                    right: '-10px',
                                    background: 'red',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold'
                                }}
                            >
                                X
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => fileInputRef.current.click()}
                                title="Add Image"
                            >
                                📷 Add Image
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={(!newPost.trim() && !image) || posting}>
                            {posting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            </div>

            {loading ? (
                <div className="flex-center" style={{ padding: '2rem' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>Loading posts...</div>
                </div>
            ) : (
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
                            No posts yet. Why not say hello?
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Feed;
