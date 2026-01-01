import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PostItem = ({ post, onDelete }) => {
    const { user, token } = useAuth();
    const [likes, setLikes] = useState(post.likes || []);
    const [comments, setComments] = useState(post.comments || []);
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [commenting, setCommenting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const isLiked = user && likes.includes(user._id);
    const isOwner = user && user._id === (post.author._id || post.author);

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleLike = async () => {
        try {
            const res = await fetch(`/api/posts/${post._id}/like`, {
                method: 'PUT',
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const updatedLikes = await res.json();
                setLikes(updatedLikes);
            }
        } catch (err) {
            console.error("Error liking post", err);
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setCommenting(true);

        try {
            const res = await fetch(`/api/posts/${post._id}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ text: newComment })
            });

            if (res.ok) {
                const updatedComments = await res.json();
                setComments(updatedComments);
                setNewComment('');
                setShowComments(true);
            }
        } catch (err) {
            console.error("Error commenting", err);
        } finally {
            setCommenting(false);
        }
    };

    const handleDeletePost = async () => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/posts/${post._id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                if (onDelete) onDelete(post._id);
            }
        } catch (err) {
            console.error("Error deleting post", err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Delete this comment?")) return;
        try {
            const res = await fetch(`/api/posts/${post._id}/comment/${commentId}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                const updatedComments = await res.json();
                setComments(updatedComments);
            }
        } catch (err) {
            console.error("Error deleting comment", err);
        }
    };

    if (isDeleting) return null;

    return (
        <div className="glass-panel card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: post.author.profilePicture ? `url(${post.author.profilePicture}) center/cover` : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1.2rem'
                    }}>
                        {!post.author.profilePicture && post.author.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <Link to={`/user/${post.author._id}`} style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {post.author.username}
                        </Link>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {formatDate(post.createdAt)}
                        </div>
                    </div>
                </div>

                {isOwner && (
                    <button
                        onClick={handleDeletePost}
                        style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '1.2rem' }}
                        title="Delete Post"
                    >
                        🗑️
                    </button>
                )}
            </div>

            <div style={{ fontSize: '1.1rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', marginBottom: '1rem' }}>
                {post.content}
            </div>

            {post.image && (
                <div style={{ marginBottom: '1rem', borderRadius: '12px', overflow: 'hidden' }}>
                    <img src={post.image} alt="Post content" style={{ width: '100%', display: 'block' }} />
                </div>
            )}

            <div style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--glass-border)',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
            }}>
                <button
                    onClick={handleLike}
                    className="btn"
                    style={{
                        padding: '0.5rem 1rem',
                        background: isLiked ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                        color: isLiked ? 'var(--secondary)' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}
                >
                    {isLiked ? '❤️' : '🤍'} {likes.length}
                </button>

                <button
                    onClick={() => setShowComments(!showComments)}
                    className="btn"
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}
                >
                    💬 {comments.length}
                </button>
            </div>

            {showComments && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
                        {comments.length === 0 ? (
                            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No comments yet.</div>
                        ) : (
                            comments.map((comment, index) => {
                                const isCommentOwner = user && user._id === (comment.user._id || comment.user);
                                return (
                                    <div key={index} style={{ marginBottom: '1rem', display: 'flex', gap: '10px' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: comment.user.profilePicture ? `url(${comment.user.profilePicture}) center/cover` : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                            flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem'
                                        }}>
                                            {!comment.user.profilePicture && comment.user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '12px', flex: 1, position: 'relative' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.2rem', display: 'flex', justifyContent: 'space-between' }}>
                                                <div>
                                                    {comment.user.username}
                                                    <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                                                        {formatDate(comment.createdAt)}
                                                    </span>
                                                </div>
                                                {(isCommentOwner || isOwner) && (
                                                    <button
                                                        onClick={() => handleDeleteComment(comment._id)}
                                                        style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '0.9rem', padding: '0 5px' }}
                                                        title="Delete Comment"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.95rem' }}>{comment.text}</div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <form onSubmit={handleComment} style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button type="submit" className="btn btn-primary" disabled={!newComment.trim() || commenting}>
                            Send
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default PostItem;
