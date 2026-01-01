import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MessagesDropdown from './MessagesDropdown';
import './Navbar.css';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    const handleLogout = () => {
        logout();
        closeMenu();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <nav className="navbar">
            <div className="navbar-content">
                <Link to="/" className="nav-brand" onClick={closeMenu}>
                    AuthApp
                </Link>

                <div className="hamburger" onClick={toggleMenu}>
                    <span className={`bar ${isOpen ? 'open' : ''} `}></span>
                    <span className={`bar ${isOpen ? 'open' : ''} `}></span>
                    <span className={`bar ${isOpen ? 'open' : ''} `}></span>
                </div>

                <ul className={`nav-menu ${isOpen ? 'active' : ''}`}>
                    {user ? (
                        <>
                            <li className="nav-item">
                                <Link to="/" className={isActive('/')} onClick={closeMenu}>Feed</Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/users" className={isActive('/users')} onClick={closeMenu}>Users</Link>
                            </li>
                            <li className="nav-item">
                                <MessagesDropdown />
                            </li>
                            <li className="nav-item">
                                <Link to="/profile" className={isActive('/profile')} onClick={closeMenu}>Profile</Link>
                            </li>
                            <li className="nav-item">
                                <button className="nav-btn" onClick={handleLogout}>Logout</button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li className="nav-item">
                                <Link to="/login" className={isActive('/login')} onClick={closeMenu}>Login</Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/register" className={`nav - btn ${isActive('/register')} `} onClick={closeMenu}>Register</Link>
                            </li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;
