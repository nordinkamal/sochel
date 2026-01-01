require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const http = require('http');
const socketIo = require('socket.io');
const User = require('./models/User');
const Post = require('./models/Post'); // Import Post model
const Message = require('./models/Message'); // Import Message model
const Notification = require('./models/Notification'); // Import Notification model
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Server } = require("socket.io");

// ... Cloudinary config ...

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity in dev
        methods: ["GET", "POST"]
    }
});

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;


// Middleware to parse JSON bodies
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        console.log(`${req.method} ${req.path}`, {
            params: req.params,
            query: req.query,
            body: req.body
        });
    }
    next();
});

// JWT authentication middleware
const auth = (req, res, next) => {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected');
        // Server will be started at the end of the file
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit process if MongoDB connection fails
    });

// User registration endpoint
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            username,
            email,
            password
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.status(201).json({ token, redirect: '/posts.html' });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                // res.json({ token }); // Removed original token response
                res.json({ token, redirect: '/posts.html' }); // Redirect to posts page
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Create a post
app.post('/api/posts', [auth, upload.single('image')], async (req, res) => {
    const { content } = req.body;

    try {
        let imageUrl = '';
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const result = await cloudinary.uploader.upload(dataURI, {
                folder: 'auth-app-posts'
            });
            imageUrl = result.secure_url;
        }

        const newPost = new Post({
            content,
            image: imageUrl,
            author: req.user.id
        });

        const post = await newPost.save();
        // Populate author to return complete post data immediately
        await post.populate('author', ['username', '_id', 'profilePicture']);

        res.json(post);

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Get all posts
app.get('/api/posts', auth, async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('author', ['username', '_id', 'profilePicture'])
            .populate('comments.user', ['username', '_id', 'profilePicture']);
        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Get current user's profile
app.get('/api/profile/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        const posts = await Post.find({ author: req.user.id })
            .sort({ createdAt: -1 })
            .populate('author', ['username', '_id', 'profilePicture']);
        res.json({ user, posts });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Get user profile by ID
app.get('/api/profile/user/:userId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        const posts = await Post.find({ author: req.params.userId })
            .sort({ createdAt: -1 })
            .populate('author', ['username', '_id', 'profilePicture']);

        // Check if current user is following this user
        const currentUser = await User.findById(req.user.id);
        const isFollowing = currentUser.following && currentUser.following.some(
            id => id.toString() === req.params.userId
        );

        // Get followers and following counts
        const followersCount = user.followers ? user.followers.length : 0;
        const followingCount = user.following ? user.following.length : 0;

        res.json({
            user,
            posts,
            isFollowing,
            followersCount,
            followingCount
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Upload/Update Profile Picture
app.post('/api/profile/upload', [auth, upload.single('image')], async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No image file uploaded' });
        }

        // Upload to Cloudinary using stream
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'auth-app-profiles',
            width: 300,
            crop: "scale"
        });

        const user = await User.findById(req.user.id);
        user.profilePicture = result.secure_url;
        await user.save();

        res.json({ msg: 'Profile picture updated', profilePicture: user.profilePicture });

    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Follow a user
app.post('/api/follow/:userId', auth, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const currentUserId = req.user.id;

        console.log('Follow request:', { targetUserId, currentUserId });

        // Check if user is trying to follow themselves
        if (targetUserId === currentUserId) {
            return res.status(400).json({ msg: 'You cannot follow yourself' });
        }

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser) {
            return res.status(404).json({ msg: 'Current user not found' });
        }

        if (!targetUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Initialize following array if it doesn't exist
        if (!currentUser.following) {
            currentUser.following = [];
        }

        // Check if already following (compare as strings)
        const isAlreadyFollowing = currentUser.following.some(
            id => id.toString() === targetUserId
        );

        if (isAlreadyFollowing) {
            return res.status(400).json({ msg: 'You are already following this user' });
        }

        // Add to following list of current user
        currentUser.following.push(targetUserId);
        await currentUser.save();

        // Add to followers list of target user
        if (!targetUser.followers) {
            targetUser.followers = [];
        }
        targetUser.followers.push(currentUserId);
        await targetUser.save();

        // Create notification for the followed user
        const notification = new Notification({
            user: targetUserId,
            type: 'follow',
            fromUser: currentUserId
        });
        await notification.save();

        // Get updated follower count
        const updatedTargetUser = await User.findById(targetUserId);
        const followersCount = updatedTargetUser.followers ? updatedTargetUser.followers.length : 0;

        res.json({
            msg: 'User followed successfully',
            followersCount: followersCount
        });
    } catch (err) {
        console.error('Follow error:', err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Unfollow a user
app.delete('/api/unfollow/:userId', auth, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const currentUserId = req.user.id;

        console.log('Unfollow request:', { targetUserId, currentUserId });

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser) {
            return res.status(404).json({ msg: 'Current user not found' });
        }

        if (!targetUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Initialize following array if it doesn't exist
        if (!currentUser.following) {
            currentUser.following = [];
        }

        // Check if not following (compare as strings)
        const isFollowing = currentUser.following.some(
            id => id.toString() === targetUserId
        );

        if (!isFollowing) {
            return res.status(400).json({ msg: 'You are not following this user' });
        }

        // Remove from following list of current user
        currentUser.following = currentUser.following.filter(
            id => id.toString() !== targetUserId
        );
        await currentUser.save();

        // Remove from followers list of target user
        if (targetUser.followers) {
            targetUser.followers = targetUser.followers.filter(
                id => id.toString() !== currentUserId
            );
            await targetUser.save();
        }

        res.json({ msg: 'User unfollowed successfully' });
    } catch (err) {
        console.error('Unfollow error:', err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Get all users (for discover/users page)
app.get('/api/users', auth, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const users = await User.find({ _id: { $ne: currentUserId } })
            .select('-password')
            .limit(50); // Limit to 50 users

        // Get follow status for each user
        const currentUser = await User.findById(currentUserId);
        const usersWithFollowStatus = users.map(user => {
            const isFollowing = currentUser.following && currentUser.following.some(
                id => id.toString() === user._id.toString()
            );
            const followersCount = user.followers ? user.followers.length : 0;
            const followingCount = user.following ? user.following.length : 0;

            return {
                _id: user._id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt,
                isFollowing,
                followersCount,
                followingCount
            };
        });

        res.json(usersWithFollowStatus);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Like/Unlike a post
app.put('/api/posts/:id/like', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Check if the post has already been liked
        const likeIndex = post.likes.findIndex(
            like => like.toString() === req.user.id
        );

        if (likeIndex > -1) {
            // Unlike: Remove user from likes array
            post.likes.splice(likeIndex, 1);
        } else {
            // Like: Add user to likes array
            post.likes.unshift(req.user.id);

            // Create notification for post owner (if not self)
            if (post.author.toString() !== req.user.id) {
                const notification = new Notification({
                    user: post.author,
                    type: 'like',
                    fromUser: req.user.id,
                    relatedPost: post._id
                });
                await notification.save();
            }
        }

        await post.save();
        res.json(post.likes);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Add comment to a post
app.post('/api/posts/:id/comment', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        const newComment = {
            text: req.body.text,
            user: req.user.id
        };

        post.comments.unshift(newComment);
        await post.save();

        // Populate author of the new comment
        await post.populate('comments.user', ['username', '_id', 'profilePicture']);

        // Create notification for post owner (if not self)
        if (post.author.toString() !== req.user.id) {
            const notification = new Notification({
                user: post.author,
                type: 'comment',
                fromUser: req.user.id,
                relatedPost: post._id
            });
            await notification.save();
        }

        res.json(post.comments);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Delete a comment
app.delete('/api/posts/:id/comment/:commentId', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });

        const comment = post.comments.find(c => c._id.toString() === req.params.commentId);
        if (!comment) return res.status(404).json({ msg: 'Comment not found' });

        if (comment.user.toString() !== req.user.id && post.author.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        post.comments = post.comments.filter(c => c._id.toString() !== req.params.commentId);
        await post.save();
        res.json(post.comments);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Delete a post
app.delete('/api/posts/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ msg: 'Post not found' });

        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await Post.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Post removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Delete all posts for a user
app.delete('/api/posts/me/all', auth, async (req, res) => {
    try {
        await Post.deleteMany({ author: req.user.id });
        res.json({ msg: 'All posts removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});


// Get a single post by ID
app.get('/api/posts/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('author', ['username', '_id', 'profilePicture']);
        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }
        res.json(post);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Old static routes removed for React SPA

// Get notifications for current user
app.get('/api/notifications', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .populate('fromUser', ['username', '_id', 'profilePicture'])
            .populate('relatedPost')
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({
            user: req.user.id,
            read: false
        });

        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found' });
        }

        if (notification.user.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        notification.read = true;
        await notification.save();

        res.json({ msg: 'Notification marked as read' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, read: false },
            { read: true }
        );

        res.json({ msg: 'All notifications marked as read' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});



// Socket.io Logic
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join_chat', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their chat room`);
    });

    socket.on('send_message', async (data) => {
        const { sender, recipient, text } = data;

        try {
            // Save message to database
            const newMessage = new Message({
                sender,
                recipient,
                text
            });
            await newMessage.save();

            // Populate sender info for frontend
            await newMessage.populate('sender', ['username', 'profilePicture']);
            await newMessage.populate('recipient', ['username', 'profilePicture']);

            // Emit to recipient
            io.to(recipient).emit('receive_message', newMessage);

            // Emit back to sender (for confirmation/UI update)
            io.to(sender).emit('receive_message', newMessage);

            // Create notification for recipient
            const notification = new Notification({
                user: recipient,
                type: 'message', // Assuming updated Notification model or frontend handling
                fromUser: sender
            });
            await notification.save();

        } catch (err) {
            console.error('Socket message error:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Get messages between two users
app.get('/api/messages/:userId', auth, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const otherUserId = req.params.userId;

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, recipient: otherUserId },
                { sender: otherUserId, recipient: currentUserId }
            ]
        })
            .sort({ createdAt: 1 }) // Oldest first
            .populate('sender', ['username', 'profilePicture'])
            .populate('recipient', ['username', 'profilePicture']);

        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Delete a message
app.delete('/api/messages/:id', auth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ msg: 'Message not found' });

        // Only sender can delete their message
        if (message.sender.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await Message.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Message removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Get list of conversations (users chatted with)
app.get('/api/conversations', auth, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // Find all messages where current user is sender or recipient
        const messages = await Message.find({
            $or: [{ sender: currentUserId }, { recipient: currentUserId }]
        }).sort({ createdAt: -1 });

        const userIds = new Set();
        messages.forEach(msg => {
            if (msg.sender.toString() !== currentUserId) userIds.add(msg.sender.toString());
            if (msg.recipient.toString() !== currentUserId) userIds.add(msg.recipient.toString());
        });

        const users = await User.find({ _id: { $in: Array.from(userIds) } }).select('username profilePicture');

        // Map users to include last message for preview if desired, or just list them
        const conversations = users.map(user => {
            return {
                _id: user._id,
                username: user.username,
                profilePicture: user.profilePicture
            };
        });

        res.json(conversations);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle SPA routing - serve index.html for all other routes
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// Handle SPA routing - serve index.html for all other routes
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Socket.io initialized');
});


