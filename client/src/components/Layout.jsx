import { Outlet, Link, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const Layout = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;

        const newSocket = io('/');
        setSocket(newSocket);
        newSocket.emit('join_chat', user._id);

        return () => newSocket.close();
    }, [user]);

    useEffect(() => {
        if (!socket) return;

        socket.on('receive_message', (message) => {
            // Only show alert/notification if we are NOT in the chat with the sender
            // Check current URL mechanism or simple alert for now
            const senderId = message.sender._id || message.sender;
            const senderName = message.sender.username || "Someone";

            if (senderId !== user._id) {
                // Simple browser notification or toast could be added here
                // For now, let's use a non-blocking UI indication or just console
                console.log("New message from", senderName);

                // Using standard Notification API if supported and granted
                if (Notification.permission === "granted") {
                    new Notification(`New message from ${senderName}`, {
                        body: message.text
                    });
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                            new Notification(`New message from ${senderName}`, {
                                body: message.text
                            });
                        }
                    });
                }
            }
        });

        return () => socket.off('receive_message');
    }, [socket, user]);

    return (
        <>
            <Navbar />
            <div className="container">
                {children}
            </div>
        </>
    );
};

export default Layout;
